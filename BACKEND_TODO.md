# 后端优化方案

> 基于当前代码审查，按优先级排列。P0 已修复，P1~P3 待处理。

---

## P1：功能缺陷与规范问题（建议尽快改）

### 1. 消息落 MySQL，Redis 只做缓存

**现状**：聊天消息和会话列表只存 Redis，TTL 7 天，过期全丢。

**方案**：

```
新增表：
  tb_chat_session (id, user_id, title, create_time, update_time)
  tb_chat_message (id, session_id, role, content, create_time)

写入流程：
  Redis 写入成功 → 异步写 MySQL（保证最终一致）

读取流程：
  先查 Redis → miss 时查 MySQL → 回填 Redis

Redis 只保留：
  - Token / 验证码（已有）
  - 热点会话缓存（最近 N 条消息）
  - 会话列表缓存
```

**涉及文件**：
- 新增 `ChatSessionMapper.java`（MyBatis）
- 新增 `tb_chat_session` / `tb_chat_message` 建表 SQL
- 改 `ChatSessionRepositoryimpl` — 增加 MySQL 读写
- 改 `ChatServiceimpl` — 写入时双写

---

### 2. `ask-stream` 改 POST

**现状**：`@GetMapping("/ask-stream")`，但方法体内保存消息到 Redis，有副作用，违反 HTTP 语义。

**方案**：
- 后端改为 `@PostMapping("/ask-stream")`
- 前端 `fetch` 改为 `POST`，参数从 query string 移到 body

**涉及文件**：
- `ChatController.java` — 注解改 `@PostMapping`
- 前端 `chat.js` — fetch 方法改 POST

---

### 3. Authorization 加 Bearer 前缀

**现状**：前端发 `Authorization: xxx`，后端直接当 token 用，不符合 OAuth/JWT 规范。

**方案**：
- 前端请求拦截器改为 `Authorization: Bearer ${token}`
- 后端 `RefreshTokenInterceptor` 解析时去掉 `Bearer ` 前缀
- 后端 `UserController.logout` 如果从 header 取 token，也要同步改

**涉及文件**：
- `RefreshTokenInterceptor.java` — 加 `token.startsWith("Bearer ") ? token.substring(7) : token`
- 前端 `request.js` — `Authorization: 'Bearer ' + token`
- 前端 `chat.js` — 流式 fetch 的 header 同步改

---

### 4. system prompt 统一

**现状**：
- 非流式 `SendSession()` 用 `"你要会自己研究上下文"`
- 流式 `sendSessionStream()` 用 `"你是一个有用的助手"`

**方案**：统一为一个常量，放在配置或常量类里。

```java
// 建议放在 ChatClientConfig 或常量类
public static final String SYSTEM_PROMPT = "你是一个有用的助手，请根据上下文回答用户的问题。";
```

**涉及文件**：
- `ChatServiceimpl.java` — 两处 `.system(...)` 改为引用同一常量
- 可选：`application.properties` 加 `aichat.system-prompt=...` 用 `@Value` 注入

---

### 5. 删除/清空会话 API 分离

**现状**：`DELETE /chat/clear-session` 同时做"清空消息 + 删除会话记录 + 删除标题"三件事，语义混合。

**方案**：
- `DELETE /chat/sessions/{sessionId}` — 删除整个会话（含消息+标题+列表记录）
- `DELETE /chat/sessions/{sessionId}/messages` — 仅清空消息（保留会话壳）
- 或简化为只保留删除接口，去掉清空场景

**涉及文件**：
- `ChatController.java` — 新增/拆分接口
- `ChatService.java` + `ChatServiceimpl.java` — 对应方法
- 前端 `chat.js` — API 路径调整

---

## P2：工程规范（求职加分项）

### 6. 全局异常处理

**现状**：没有 `@RestControllerAdvice`，异常直接返回 500。

**方案**：
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    public Result<?> handleBusiness(BusinessException e) { ... }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<?> handleValidation(MethodArgumentNotValidException e) { ... }

    @ExceptionHandler(Exception.class)
    public Result<?> handleAll(Exception e) { ... }
}
```

新增自定义异常类：`BusinessException(code, message)`

---

### 7. 参数校验

**现状**：Controller 方法没加 `@Valid`，DTO 没加 `@NotBlank` 等注解。

**方案**：
```java
// LoginFormDTO
@NotBlank(message = "手机号不能为空") @Pattern(regexp = PHONE_REGEX)
private String phone;

// Controller
public Result login(@RequestBody @Valid LoginFormDTO loginForm) { ... }
```

依赖：`spring-boot-starter-validation`

---

### 8. Swagger / OpenAPI 文档

**方案**：
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.3.0</version>
</dependency>
```

Controller 加 `@Tag` / `@Operation`，DTO 加 `@Schema`。

访问：`http://localhost:8080/swagger-ui.html`

---

### 9. API 版本管理

**方案**：所有接口加 `/api/v1` 前缀。

方式一：Controller 路径改 `@RequestMapping("/api/v1/chat")`
方式二：`application.properties` 配 `server.servlet.context-path=/api/v1`
方式三：WebMvcConfig 里加路径前缀配置

---

### 10. 删冗余代码

| 文件 | 问题 |
|------|------|
| `utils/LoginInterceptor.java` | 与 `Config/LoginInterceptor.java` 重复，未被引用，应删 |
| `UserMapper.getUserByPhoneAndPassword` | 方法未被调用 |
| `ChatServiceimpl` 注入的 `UserMessage` | import 了但未直接使用（构造用的） |

---

### 11. 限流

**方案**：用 Redis + AOP 实现滑动窗口限流，或直接用 `bucket4j`。

需要限流的接口：
- `POST /user/code` — 同一手机号 60s 内只能发一次，同一 IP 每天上限
- `POST /user/login` — 同一 IP 5 次失败后锁定 30 分钟
- `POST /chat/ask` / `GET /chat/ask-stream` — 每用户每分钟 N 次

---

## P3：工程化与运维

### 12. Spring Security + JWT

用手写拦截器可以跑，但求职项目建议引入 Spring Security。

**方案**：
- 引入 `spring-boot-starter-security`
- JWT 生成/解析用 `jjwt` 或 `java-jwt`
- 替换现有 Token 逻辑（UUID → JWT）
- 配置 SecurityFilterChain 替代手写拦截器

---

### 13. Docker 化

```
Dockerfile         — 后端镜像
docker-compose.yml  — MySQL + Redis + Ollama + 后端 一键启动
```

---

### 14. 单元测试 + 集成测试

- Service 层单元测试（Mockito mock Repository）
- Controller 层集成测试（`@SpringBootTest` + `MockMvc`）
- Repository 层测试（嵌入式 Redis）

---

### 15. 监控与可观测性

- `spring-boot-starter-actuator` — 健康检查
- 自定义 Metrics：AI 调用耗时、Token 消耗、消息数
- 日志规范：统一 JSON 格式 + traceId（MDC + Sleuth/Micrometer）

---

### 16. AI 能力增强

| 方向 | 说明 |
|------|------|
| 上下文窗口管理 | 超过 token 上限时自动截断或摘要压缩 |
| RAG 知识库 | 文档上传 → 切分 → Embedding → 向量库（Milvus/PgVector）→ 检索增强 |
| Function Calling | 天气查询、代码执行等工具调用 |
| 多模型路由 | 不同场景用不同模型，带降级策略 |
| 内容安全 | Prompt 注入防护 + 敏感词过滤 |
| 评估体系 | 响应时间、Token 消耗、答案质量打分 |
