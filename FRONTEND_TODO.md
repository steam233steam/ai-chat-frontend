# 前端待办

## P1 - 功能与规范

- [x] 删除冗余 Axios 实例（`api/index.js` 已移除，统一走 `api/request.js`）
- [ ] 引入 Pinia 状态管理（user / chat / settings store，减轻 ChatView 单文件压力）
- [ ] 设置页与后端打通（新增 `GET/PUT /user/settings`，模型与温度参数传给后端）
- [x] 长会话消息分页加载（✅ 2026-10-26：`/chat/history` 支持 `limit/beforeId` 游标，滚动到顶部加载更早记录）

## P2 - 工程质量

- [ ] TypeScript 渐进式迁移（先 API 层类型定义，再 store，最后组件）
- [ ] ChatView 组件拆分（Sidebar / MessageList / MessageItem / MessageInput / CodeBlock / WelcomeScreen）
- [x] 路由守卫去重（移除 App.vue 中的 token 检查，统一在 router 守卫处理）
- [ ] 错误边界与全局错误提示（网络错误、API 错误、流式错误统一在消息气泡内展示）
- [x] 环境变量管理（`.env.development` / `.env.production`，Vite 代理读取 `loadEnv`）

## P3 - 体验优化

- [x] 消息时间戳智能格式化（刚刚 / N 分钟前 / 昨天 / MM-DD）
- [x] 模型选择（✅ 2026-10-26：`/chat/models` 拉取白名单，发送时可指定）
- [x] 输入限制与顶部工具栏（✅ 2026-10-26：8000 字上限提示；历史/设置/导出/登出入口）
- [x] 会话标题搜索（✅ 2026-10-28：侧边栏本地过滤 + 空状态）
- [x] 消息级模型标识（✅ 2026-10-28：消息头模型 chip，历史缺失时用会话锁模型兜底）
- [x] 暗色模式（✅ 2026-10-28：设计令牌 + `useTheme` 单例 + 设置页切换 + 首屏防闪烁）
- [ ] PWA 支持（vite-plugin-pwa，离线可用 + 安装到桌面）
- [ ] 长消息列表性能（虚拟滚动或分页）

## 变更记录（2026-10-28）

**视觉与主题**

- 新增 `design.css` 设计令牌、玻璃拟态、暗色模式；`useTheme` 改为可写 `isDark`，修复设置页开关无效
- 登录页 / 历史页 / 设置页视觉重构；补充全局 Markdown 样式（代码块、引用、表格、标题）
- 接入 `highlight.js` 语法高亮（18 种常用语言）+ 代码块语言标签/浮动复制按钮
- 对话区与输入区 900px 居中；输入框改成 LobeChat 式 composer（模型选择、字数、快捷键、发送区）
- 侧边栏增加分组标题、底部用户卡、会话搜索；消息头增加模型 chip 与“正在生成”状态
- 移动端头部操作折叠进“更多”菜单；登录页增加主题切换；设置页卡片图标化

**交互修复**

- 会话锁模型 409：回滚未落库的用户消息、恢复输入框内容、刷新会话列表并展示真实锁定模型
- 路由前进/后退、删除会话切换时同步模型锁；点击当前会话不再中断正在生成的回复
- 历史消息分页增加会话/请求竞态保护，快速切换会话不会串数据
- 修复历史消息每个气泡都启动打字机 RAF 空转的问题；流式长代码块不再在 400 字分界处断裂

## 变更记录（2026-10-26）

**模型与分页**

- `api/chat.js`：新增 `getModels()` 拉取可用模型白名单；`sendMessageStream` / `sendMessage` 支持可选 `modelName` 参数
- 历史消息改为游标分页：`getHistory(sessionId, { limit, beforeId })`，首屏加载一页，滚动到顶部加载更早记录
- 单条消息输入上限 8000 字，超出显示剩余字数提示
- 会话标题编辑限制 50 字，接近上限显示剩余字数

**顶部工具栏**

- ChatView 顶部：历史记录入口、设置入口、导出下拉（JSON / 纯文本）、登出按钮
- PC 端顶部显示用户头像与昵称（读取 `localStorage.loginUser`）

**错误处理**

- `api/request.js`：业务错误（400/500 等）不再全局弹窗，改为带 `business` 标记的 Error 抛给调用方；兼容无 `code` 字段的旧接口
- 流式请求 401 自动清 token 并跳登录页

**Markdown / 导出**

- `utils/markdown.js`：`copyText` 统一复制逻辑，非 HTTPS 环境降级 `execCommand`；新增 `exportChatAsJSON` / `exportChatAsText` 导出工具

## 已完成的修复记录（2026-10-17）

**功能修复**

- SSE 解析抽取到 `utils/sse.js`：保留 token 前导空格、兼容 CRLF / `[DONE]` / 跨 chunk 截断，附 9 个单元测试
- 路由前进/后退切换会话：`watch(route.params.id)` 同步，会话 ID 写入地址栏（`/chat/:id`），刷新不丢失
- 停止生成：中断后消息收尾为 Markdown 并同步会话标题，不再停留在纯文本
- 历史消息代码块复制按钮挂载时机修正
- 删除会话后侧边栏列表同步，自动切换到下一个会话
- 中文输入法回车误发送：`isComposing` 判断
- 登录页：验证码 60s 冷却倒计时提示、失败原因展示、新用户进入设置密码步骤后按需重新获取验证码
- `vite.config.js` 改用 `loadEnv` 读取 `.env` 变量

**工程与体验**

- `useNetwork` 改为标准 composable，离线横幅真正生效
- 设置页改为真实用户资料（读取 `/user/me`、修改昵称 `PUT /user/profile`）
- 历史页 / 设置页加入导航入口，删除会话失败提示原因
- 复制逻辑统一（非 HTTPS 环境降级）

## 验证

- `npm test`：21/21 通过（9 个 SSE 解析 + 8 个代码围栏边界 + 4 个代码高亮）
- `npm run build`：通过
- Headless 浏览器实测：流式输出、停止生成、刷新历史、会话管理、登录容错均正常
