# 后端待办

> 后端代码在 `spring--ai---` 仓库，此文件仅作跨仓库协作备忘。

## P1 - 功能

- [ ] 消息落 MySQL，Redis 只做缓存（新建 `tb_chat_session` / `tb_chat_message`，写入双写、读取回填）
- [ ] `/chat/ask-stream` 改为 POST（语义修正）
- [ ] `Authorization` 加 `Bearer` 前缀（前后端同步修改）
- [ ] 删除 / 清空会话接口分离
- [ ] 统一 system prompt（非流式与流式目前不一致）

## P2 - 工程规范

- [ ] 全局异常处理（`@RestControllerAdvice` + 业务异常）
- [ ] 参数校验（`@Valid` + `@NotBlank`）
- [ ] Swagger / OpenAPI 文档
- [ ] 删除冗余代码（`utils/LoginInterceptor` 等未引用类）
- [ ] 接口限流（验证码 / 登录 / 聊天频率限制）

## P3 - 增强

- [ ] Spring Security + JWT 替换手写 Token 拦截器
- [ ] Docker 化（docker-compose 一键启动 MySQL + Redis + Ollama + 后端）
- [ ] 单元测试 + 集成测试
- [ ] 监控（actuator + 自定义 Metrics）
- [ ] AI 能力：上下文窗口管理、RAG 知识库、Function Calling、多模型路由
