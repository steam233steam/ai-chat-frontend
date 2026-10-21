# AI Chat 项目文档

> 版本：v1.0 | 更新日期：2026-09-27

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [后端架构](#4-后端架构)
5. [前端架构](#5-前端架构)
6. [数据库设计](#6-数据库设计)
7. [Redis 数据结构](#7-redis-数据结构)
8. [接口文档](#8-接口文档)
9. [核心流程](#9-核心流程)
10. [本地部署](#10-本地部署)
11. [已知问题与后续计划](#11-已知问题与后续计划)

---

## 1. 项目概述

AI Chat 是一个全栈 AI 对话助手应用，支持手机验证码登录、流式 AI 对话、多会话管理、历史记录等功能。后端基于 Spring Boot + Spring AI + Ollama（qwen2.5-coder:7b），前端基于 Vue 3 + Element Plus，使用 Redis 做会话存储和 Token 认证，MySQL 做用户持久化。

### 核心功能

| 功能 | 说明 |
|------|------|
| 用户认证 | 手机验证码登录 + 密码登录，新用户自动注册 |
| 流式对话 | SSE 流式输出，逐字显示 AI 回复 |
| 多会话管理 | 创建、切换、重命名、删除会话 |
| 历史记录 | 会话列表 + 消息历史，按时间倒序 |
| Markdown 渲染 | AI 回复支持 Markdown，代码块带复制按钮 |
| 停止生成 | 流式输出过程中可随时取消 |
| 导出对话 | 支持 JSON / 纯文本导出 |
| 移动端适配 | 响应式布局，侧边栏可折叠 |

---

## 2. 技术栈

### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| Spring Boot | 3.2.5 | 基础框架 |
| Spring AI | 1.0.0-M5 | AI 对话框架 |
| Ollama | - | 本地 AI 模型服务 |
| Spring Data Redis | - | 缓存与会话存储 |
| MyBatis | 3.0.3 | ORM |
| MySQL | 8.0 | 用户数据持久化 |
| Lombok | - | 代码简化 |
| Hutool | 5.8.25 | 工具库 |

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | 3.5 | 前端框架 |
| Vite | 8.3.0 | 构建工具 |
| Element Plus | 2.4 | UI 组件库 |
| Vue Router | 4.6 | 路由 |
| Axios | 1.18 | HTTP 请求 |
| Marked | 18 | Markdown 解析 |
| DOMPurify | 3.4 | HTML 安全过滤 |

---

## 3. 项目结构

### 后端结构

```
D:\maven-project\aichat\
├── src/main/java/com/aichat/
│   ├── AichatApplication.java           # 启动类
│   ├── Controller/
│   │   ├── ChatController.java          # 聊天接口
│   │   └── UserController.java          # 用户接口
│   ├── Service/
│   │   ├── ChatService.java             # 聊天服务接口
│   │   ├── UserService.java             # 用户服务接口
│   │   └── impl/
│   │       ├── ChatServiceimpl.java     # 聊天服务实现
│   │       └── UserServiceimpl.java     # 用户服务实现
│   ├── Repository/
│   │   ├── ChatSessionRepository.java   # 会话存储接口
│   │   ├── UserRepository.java          # 用户存储接口
│   │   └── impl/
│   │       ├── ChatSessionRepositoryimpl.java  # Redis 会话存储
│   │       └── UserRepositoryimpl.java        # Redis 用户存储
│   ├── Mapper/
│   │   └── UserMapper.java              # MyBatis 用户 Mapper
│   ├── Config/
│   │   ├── WebMvcConfig.java            # 拦截器注册
│   │   ├── RedisConfig.java             # Redis 序列化配置
│   │   ├── ChatClientConfig.java        # AI 客户端配置
│   │   ├── LoginInterceptor.java        # 登录校验拦截器
│   │   └── RefreshTokenInterceptor.java # Token 刷新拦截器
│   ├── Dto/
│   │   ├── Result.java                  # 统一响应体
│   │   ├── LoginFormDTO.java            # 登录表单
│   │   ├── User.java                    # 用户实体
│   │   ├── UserDto.java                 # 前端用户 DTO
│   │   └── SMessage.java                # 会话消息
│   └── utils/
│       ├── UserHolder.java              # ThreadLocal 用户上下文
│       ├── RedisConstants.java          # Redis Key 常量
│       ├── PasswordUtils.java           # BCrypt 密码加密
│       ├── RegexUtils.java              # 正则校验
│       └── RegexPatterns.java           # 正则常量
├── src/main/resources/
│   └── application.properties           # 配置文件
└── docs/
    └── API.md                           # API 文档
```

### 前端结构

```
D:\桌面\Vue\ai-chat-project\
├── src/
│   ├── main.js                          # 应用入口
│   ├── App.vue                          # 根组件
│   ├── router/
│   │   └── index.js                     # 路由配置
│   ├── api/
│   │   ├── request.js                   # Axios 实例（主力）
│   │   ├── index.js                     # Axios 实例（旧版）
│   │   ├── chat.js                      # 聊天 API
│   │   └── user.js                      # 用户 API
│   ├── views/
│   │   ├── ChatView.vue                 # 聊天主页面
│   │   ├── login/index.vue              # 登录页
│   │   ├── layout/index.vue             # 布局容器
│   │   ├── history/index.vue            # 历史页
│   │   ├── settings/index.vue           # 设置页
│   │   └── 404.vue                      # 404 页
│   ├── components/
│   │   └── OfflineBanner.vue            # 离线提示
│   ├── composables/
│   │   └── useNetwork.js                # 网络状态组合函数
│   ├── utils/
│   │   └── markdown.js                  # Markdown 渲染 + 导出
│   └── assets/
│       ├── base.css                     # 基础样式
│       └── main.css                     # 全局样式
├── vite.config.js                       # Vite 构建配置
└── package.json
```

---

## 4. 后端架构

### 4.1 分层架构

```
Controller 层（接口）
    ↓ 调用
Service 层（业务逻辑）
    ↓ 调用
Repository 层（Redis 存储）/ Mapper 层（MySQL 存储）
```

### 4.2 拦截器链

请求进入时依次经过两个拦截器：

```
HTTP 请求
    ↓
RefreshTokenInterceptor（拦截 /**，排除 /user/code 和 /user/login）
    → 从 Authorization 头取 Token
    → 从 Redis 查用户信息
    → 存入 UserHolder (ThreadLocal)
    → 刷新 Token 过期时间
    ↓
LoginInterceptor（拦截 /chat/** 和 /user/me）
    → 从 UserHolder 获取用户
    → 未登录返回 401
    ↓
Controller 处理请求
    ↓
afterCompletion
    → 清除 UserHolder 防内存泄漏
```

### 4.3 核心类说明

| 类 | 职责 |
|----|------|
| `ChatController` | 聊天接口：发送消息、流式发送、获取历史、会话管理 |
| `UserController` | 用户接口：验证码、登录、密码、资料 |
| `ChatServiceimpl` | 聊天业务：调用 ChatClient、保存消息到 Redis |
| `UserServiceimpl` | 用户业务：注册、登录、密码管理 |
| `ChatSessionRepositoryimpl` | Redis 会话 CRUD |
| `UserRepositoryimpl` | Redis Token + 验证码管理 |
| `UserMapper` | MyBatis 用户表 CRUD |
| `ChatClientConfig` | 配置 Spring AI ChatClient Bean |
| `RefreshTokenInterceptor` | Token 解析 + 续期 |
| `LoginInterceptor` | 登录校验 |
| `UserHolder` | ThreadLocal 存储当前用户 |
| `SMessage` | 消息实体（text + type + timestamp） |

### 4.4 AI 对话配置

```yaml
# application.properties
spring.ai.ollama.base-url=http://localhost:11434
spring.ai.ollama.chat.options.model=qwen2.5-coder:7b
spring.ai.ollama.chat.options.temperature=0.7
```

- 非流式对话 system prompt: "你要会自己研究上下文"
- 流式对话 system prompt: "你是一个有用的助手"
- 流式输出使用 Reactor `Flux<String>`，通过 `doFinally` 异步保存 AI 回复到 Redis

---

## 5. 前端架构

### 5.1 路由结构

| 路径 | 组件 | 需要登录 | 说明 |
|------|------|----------|------|
| `/login` | login/index.vue | 否 | 登录页 |
| `/` | layout/index.vue | 是 | 布局容器，重定向到 /chat |
| `/chat` | ChatView.vue | 是 | 新对话 |
| `/chat/:id` | ChatView.vue | 是 | 指定会话 |
| `/history` | history/index.vue | 是 | 历史会话列表 |
| `/settings` | settings/index.vue | 是 | 设置页 |
| `/:pathMatch(.*)*` | 404.vue | 否 | 404 兜底 |

### 5.2 请求层设计

```
api/request.js  →  Axios 实例（baseURL: /api）
    ├── 请求拦截器：自动加 Authorization
    └── 响应拦截器：401 清 token 跳登录

api/chat.js     →  聊天相关接口
    ├── 非流式：使用 Axios（自动带 Token）
    └── 流式：使用 fetch（手动加 Token + AbortSignal）

api/user.js     →  用户相关接口
```

### 5.3 流式输出实现

```
用户输入
    ↓
ChatView.sendMessage()
    ↓
chat.js sendMessageStream()
    ├── fetch /api/chat/ask-stream
    ├── 手动加 Authorization header
    └── 返回 AbortController（可取消）
    ↓
SSE 解析（按 \n\n 分割事件）
    ├── 匹配 data: 字段
    ├── 收到 [DONE] 或流关闭 → onComplete
    └── 每个 chunk → onChunk 回调
    ↓
ChatView onChunk
    ├── reactive(aiMsg).content += chunk  ← Vue 响应式触发
    ├── 传输中：纯文本显示（white-space: pre-wrap）
    └── 完成后：marked + DOMPurify 渲染 Markdown
    ↓
requestAnimationFrame 合并滚动
    └── isNearBottom 判断 → 自动滚动到底部
```

### 5.4 组件依赖

```
main.js
└── App.vue
    └── <router-view>
        ├── /login → login/index.vue
        │   └── api/user.js
        ├── /chat → ChatView.vue
        │   ├── api/chat.js
        │   ├── api/user.js
        │   ├── utils/markdown.js
        │   └── components/OfflineBanner.vue
        ├── /history → history/index.vue
        │   └── api/chat.js
        └── /settings → settings/index.vue
```

### 5.5 Element Plus 按需导入

通过 `unplugin-auto-import` + `unplugin-vue-components` + `ElementPlusResolver` 实现组件和 API 的自动按需导入，无需手动 `import`。

---

## 6. 数据库设计

### MySQL 表：`tb_user`

| 字段 | 类型 | 说明 |
|------|------|------|
| `uid` | VARCHAR | 主键，格式 `USER_ID_` + 随机 10 位 |
| `name` | VARCHAR | 用户昵称 |
| `phone` | VARCHAR | 手机号 |
| `password` | VARCHAR | BCrypt 加密密码 |
| `create_time` | DATETIME | 创建时间 |
| `update_time` | DATETIME | 更新时间 |

```sql
CREATE TABLE IF NOT EXISTS tb_user (
    uid         VARCHAR(50)   PRIMARY KEY,
    name        VARCHAR(50),
    phone       VARCHAR(20)   NOT NULL,
    password    VARCHAR(100),
    create_time DATETIME      DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 7. Redis 数据结构

### Key 前缀

所有 Key 统一前缀 `aichat:`。

| Key | 类型 | TTL | 说明 |
|-----|------|-----|------|
| `aichat:login:code:{phone}` | String | 5 分钟 | 登录验证码 |
| `aichat:login:token:{token}` | Hash | 7 天 | 用户登录信息（id/name/phone） |
| `aichat:chat:session:{userId}:{sessionId}` | List | 7 天 | 会话消息列表（SMessage JSON） |
| `aichat:chat:sessions:{userId}` | ZSet | 7 天 | 会话 ID 列表（score = 时间戳） |
| `aichat:chat:title:{sessionId}` | Hash | 7 天 | 会话标题（field = sessionId） |
| `aichat:user:new:{uid}` | String | 365 天 | 新用户标记 |

### SMessage 结构

```json
{
  "text": "消息内容",
  "type": "user",
  "timestamp": 1693728000000
}
```

- `type`：`user` / `assistant` / `system`
- `timestamp`：毫秒级时间戳

---

## 8. 接口文档

### 8.1 用户接口

| 方法 | 路径 | 说明 | 需登录 |
|------|------|------|--------|
| POST | `/user/code` | 发送验证码 | 否 |
| POST | `/user/login` | 验证码登录 | 否 |
| POST | `/user/login/password` | 密码登录 | 否 |
| PUT | `/user/set-password` | 设置密码 | 否（需验证码） |
| GET | `/user/me` | 获取当前用户 | 是 |
| GET | `/user/is-new-user` | 检查新用户 | 否 |
| PUT | `/user/profile` | 修改资料 | 是 |
| POST | `/user/logout` | 登出 | 是 |

### 8.2 聊天接口

所有聊天接口前缀 `/chat`，均需登录。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat/ask` | 非流式发送消息 |
| GET | `/chat/ask-stream` | 流式发送消息（SSE） |
| GET | `/chat/sessions` | 获取会话列表 |
| GET | `/chat/history` | 获取会话历史 |
| DELETE | `/chat/clear-session` | 删除/清空会话 |
| PUT | `/chat/title` | 更新会话标题 |

### 8.3 统一响应体

```json
{
  "code": 200,
  "message": "成功",
  "data": {}
}
```

- `code`: 200 成功，400 失败，401 未登录
- `message`: 状态描述
- `data`: 业务数据

### 8.4 历史消息响应格式

```json
{
  "code": 200,
  "message": "成功",
  "data": [
    {
      "role": "user",
      "content": "你好",
      "timestamp": 1693728000000
    },
    {
      "role": "assistant",
      "content": "你好！我是 AI 助手...",
      "timestamp": 1693728005000
    }
  ]
}
```

---

## 9. 核心流程

### 9.1 用户登录流程

```
用户输入手机号
    ↓
发送验证码 → POST /user/code → Redis 存验证码（5 分钟）
    ↓
用户输入验证码
    ↓
验证码登录 → POST /user/login
    ├── 校验验证码
    ├── 查 MySQL 用户
    │   ├── 存在 → 生成 Token 存 Redis
    │   └── 不存在 → 自动创建用户 → 生成 Token → 标记新用户
    └── 返回 Token
    ↓
前端检查是否新用户 → GET /user/is-new-user
    ├── 新用户 → 设置密码步骤 → PUT /user/set-password
    └── 老用户 → 直接进入聊天
```

### 9.2 流式对话流程

```
用户输入消息 → 点击发送
    ↓
前端 POST /chat/ask（用户消息同步保存到 Redis）
    → 后端调用 ChatClient.prompt() 同步等待完整回复
    → 保存 AI 回复到 Redis
    → 返回完整回复

或流式：
前端 GET /chat/ask-stream
    → 后端获取历史上下文
    → 保存用户消息到 Redis
    → 调用 ChatClient.prompt().stream() → Flux<String>
    → SSE 逐块返回 data: chunk\n\n
    → 流结束后异步保存完整 AI 回复到 Redis
    → 返回 [DONE]
    ↓
前端解析 SSE
    ├── onChunk → 追加到 reactive(aiMsg).content
    ├── onComplete → 渲染 Markdown + 保存消息
    └── 可随时 abort 取消
```

### 9.3 会话管理流程

```
新对话
    → 前端生成 sessionId（UUID）
    → 首次发送消息时后端创建 Redis List
    → ZSet 添加 sessionId
    → 默认标题 "新对话"

切换会话
    → GET /chat/history?sessionid=xxx
    → 加载消息列表
    → 按 role 字段渲染用户/AI 消息

删除会话
    → DELETE /chat/clear-session?sessionid=xxx
    → Redis ZSet 移除 + List 删除 + Hash 标题删除
```

---

## 10. 本地部署

### 10.1 后端

**前置依赖：**

| 服务 | 默认地址 | 说明 |
|------|----------|------|
| Ollama | http://localhost:11434 | AI 模型服务 |
| Redis | localhost:16379 | 缓存 |
| MySQL | localhost:13306 | 数据库 |

**Ollama 模型：**

```bash
ollama pull qwen2.5-coder:7b
```

**配置修改**（`application.properties`）：

```properties
spring.ai.ollama.base-url=http://localhost:11434
spring.ai.ollama.chat.options.model=qwen2.5-coder:7b
spring.data.redis.host=localhost
spring.data.redis.port=16379
spring.data.redis.password=你的密码
spring.datasource.url=jdbc:mysql://localhost:13306/aichat
spring.datasource.username=root
spring.datasource.password=你的密码
```

**启动：**

```bash
cd D:\maven-project\aichat
mvn spring-boot:run
```

### 10.2 前端

```bash
cd D:\桌面\Vue\ai-chat-project
npm install
npm run dev      # 开发模式
npm run build    # 生产构建
```

**开发模式**通过 Vite proxy 代理 `/api` → `http://localhost:8080`。

### 10.3 访问

| 地址 | 说明 |
|------|------|
| http://localhost:5173 | 前端开发服务器 |
| http://localhost:8080 | 后端 API |

---

## 11. 已知问题与后续计划

### 已知问题

| 问题 | 说明 |
|------|------|
| 删除会话与清空会话共用一个 API | 后端只有 `clear-session`，无独立删除接口 |
| 非流式和流式 system prompt 不一致 | 非流式："你要会自己研究上下文"，流式："你是一个有用的助手" |
| `utils/LoginInterceptor.java` 是冗余副本 | 与 `Config/LoginInterceptor.java` 功能重复，未被引用 |
| 旧消息无 timestamp | 改造前存的数据没有时间戳字段，fallback 为当前时间 |
| 设置页 API 配置未与后端打通 | 前端设置页的 API 地址/Key/模型等仅存 localStorage |

### 后续建议

- [ ] 统一 system prompt
- [ ] 删除冗余的 `utils/LoginInterceptor.java`
- [ ] 独立删除会话接口（区别于清空）
- [ ] 设置页与后端打通（模型选择、温度等参数传给后端）
- [ ] 消息时间戳显示优化（今天/昨天/日期格式化）
- [ ] 对话搜索功能
- [ ] 多模型切换支持
