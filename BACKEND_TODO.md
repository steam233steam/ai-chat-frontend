# 后端待办

> 后端代码在 [ai-chat-backend](https://github.com/steam233steam/ai-chat-backend) 仓库，此文件仅作跨仓库协作备忘。

## P1 - 功能

- [x] 消息落 MySQL，Redis 只做缓存（✅ 2026-10-22 完成：MySQL 主存储 + Redis 7 天热缓存，读未命中自动回源；前端接口行为不变）
- [ ] 前端已就绪待对接：`/chat/models` 模型白名单接口（前端 2026-10-26 已接入 `getModels()`，发消息时可选传 `modelName`）
- [ ] 前端已就绪待对接：`/chat/history` 游标分页（`limit` + `beforeId`，前端 2026-10-26 已按分页实现）
- [ ] `/chat/ask-stream` 改为 POST（语义修正）
- [ ] `Authorization` 加 `Bearer` 前缀（前后端同步修改）
- [ ] 删除 / 清空会话接口分离
- [x] 统一 system prompt（✅ ChatClientConfig 统一系统提示词）
- [x] 全局异常处理（✅ GlobalExceptionHandler + BusinessException）

## P2 - 工程规范

- [x] 参数校验（✅ @Valid + 正则校验）
- [ ] Swagger / OpenAPI 文档
- [ ] 删除冗余代码（`utils/LoginInterceptor` 等未引用类）
- [ ] 接口限流（验证码 / 登录 / 聊天频率限制）

## P3 - 增强

- [ ] Spring Security + JWT 替换手写 Token 拦截器
- [ ] Docker 化（docker-compose 一键启动 MySQL + Redis + Ollama + 后端）
- [ ] 单元测试 + 集成测试
- [ ] 监控（actuator + 自定义 Metrics）
- [ ] AI 能力：上下文窗口管理、RAG 知识库、Function Calling、多模型路由
