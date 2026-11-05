# 后端待办

> 后端代码在 [ai-chat-backend](https://github.com/steam233steam/ai-chat-backend) 仓库，此文件仅作跨仓库协作备忘。

## P1 - 功能

- [x] 消息落 MySQL，Redis 只做缓存（✅ 2026-10-22 完成：MySQL 主存储 + Redis 7 天热缓存，读未命中自动回源；前端接口行为不变）
- [x] MindButler P1 接口（✅ 2026-11-04 前后端已对接：任务 `/user/tasks`（due/分页/单条/CRUD/乐观锁完成）、记忆 `/user/memories`、待确认动作 `/user/pending-actions`（current/get/confirm/reject）；前端聊天侧边栏已展示任务/记忆管理）
- [x] 新用户判定改为 `/user/me` 返回 `isNewUser` 字段（✅ 2026-11-05 前后端已对接，前端移除独立 `/user/is-new-user` 调用；该接口可作已废弃处理）
- [ ] 短信服务 503 兜底（✅ 前端已处理：`request.js` 新增 503 文案"短信服务暂不可用，请改用密码登录或联系管理员"，登录页 503 不进 60s 冷却；后端需保证 dev 模式没接供应商时 `/user/code` 返回 503）
- [ ] 前端已就绪待对接：`/chat/models` 模型白名单接口（前端 2026-10-26 已接入 `getModels()`，发消息时可选传 `modelName`）
- [ ] 前端已就绪待对接：`/chat/history` 游标分页（`limit` + `beforeId`，前端 2026-10-26 已按分页实现）
- [ ] `/chat/ask-stream` 改为 POST（语义修正）
- [ ] `Authorization` 加 `Bearer` 前缀（前后端同步修改）
- [ ] 删除 / 清空会话接口分离
- [ ] `/chat/ask` 返回 409 表示会话模型冲突（✅ 2026-10-28 前端已处理：409 时回滚未落库的用户消息、恢复输入框内容、刷新会话列表并展示真实锁定模型；后端需保证会话锁模型后返回 409 + 真实模型名）
- [x] 统一 system prompt（✅ ChatClientConfig 统一系统提示词）
- [x] 全局异常处理（✅ GlobalExceptionHandler + BusinessException）

## P1.1 - MindButler 待办

- [x] 聊天意图提取 + `[[MB:pending=N]]` 标记（✅ 2026-11-03 前端已解析并弹确认弹窗）
- [x] 待确认动作落库 + current 恢复（✅ 前端刷新/切回会话调用 `/user/pending-actions/current`）
- [x] 记忆会话隔离 P1.3（✅ 2026-11-05 前后端已对接：`/user/memories` 带 `sessionId` 参数只返回「全局 + 当前会话」；前端 `getMemories(limit, sessionId)` 支持；P1.5 起侧栏拉全量后按 `sessionId` 分组，不再依赖本地 `currentSessionId`）
- [ ] 记忆 `scope` 字段 v7.4 兼容：旧数据带 `sessionId`，新数据用 `scope`（前端已双字段兼容）
- [ ] 任务完成幂等 + 版本冲突 409（✅ 前端已处理：列表没 version 时拉单条拿最新 version，409 提示刷新）

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
