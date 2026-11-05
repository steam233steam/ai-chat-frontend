# 前端待办

## P1 - 功能与规范

- [x] 删除冗余 Axios 实例（`api/index.js` 已移除，统一走 `api/request.js`）
- [x] 聊天任务确认弹窗（✅ 2026-11-03：流式结束后解析 pending 标记，自动弹出 TaskConfirmDialog；确认/取消/稍后处理；刷新用 current 恢复）
- [x] MindButler P1 接口封装（✅ 2026-11-04：任务/记忆/待确认动作全套 REST 接口封装进 `api/user.js`）
- [x] 设置页任务/记忆管理（✅ 2026-11-04：任务过滤/完成/删除 + 记忆删除；完成任务走乐观锁 409 重试；P1.5 已迁移至聊天侧边栏）
- [x] 侧边栏任务/记忆管理（✅ 2026-11-05：会话/任务双 tab；会话级记忆跟随会话展开、全局记忆置顶；任务支持筛选/完成/删除/来源会话跳转）
- [x] 记忆会话隔离 P1.3（✅ 2026-11-05：`getMemories` 带 `sessionId` 只返回「全局 + 当前会话」；P1.5 侧栏改为拉全量后按 `sessionId` 分组，不再依赖 `localStorage.currentSessionId`）
- [x] 到期任务应用内提醒（✅ 2026-11-05：页面可见时每 30 秒轮询 `/user/tasks/due`，只弹 10 分钟内到期任务，按 `taskId + dueAt` 去重，点击通知切到任务 tab）
- [x] 登录流程简化（✅ 2026-11-05：`isNewUser` 由 `/user/me` 返回，移除独立 `/user/is-new-user` 接口调用；503 短信服务不可用引导改用密码登录；60s 冷却仅在后端 400"频繁"时启动）
- [ ] 引入 Pinia 状态管理（user / chat / settings store，减轻 ChatView 单文件压力）
- [x] 设置页与后端打通（✅ 2026-10-17：读取 `/user/me`、修改昵称 `PUT /user/profile`；2026-10-28 增加暗色主题切换，展示服务信息）
- [x] 长会话消息分页加载（✅ 2026-10-26：`/chat/history` 支持 `limit/beforeId` 游标，滚动到顶部加载更早记录）

## P2 - 工程质量

- [ ] TypeScript 渐进式迁移（先 API 层类型定义，再 store，最后组件）
- [x] ChatView 组件拆分（✅ 2026-10-28：Sidebar / ChatMessage / ChatComposer / WelcomeScreen 已抽取；滚动与分页仍由 ChatView 统一管理）
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
- [x] 登录页 / 历史页视觉重构（✅ 2026-11-05：玻璃拟态 + 背景光斑 + 步骤滑动过渡 / 卡片化 + motion-v 入场 + 模型标签）
- [ ] PWA 支持（vite-plugin-pwa，离线可用 + 安装到桌面）
- [ ] 长消息列表性能（虚拟滚动或分页）

## 变更记录（2026-11-05 反馈修复）

**确认弹窗性能 / 人设回执 / 任务能力边界**

- 新增 `src/utils/dueTasks.js`：到期通知选择、`taskId + dueAt` 去重、localStorage 记录清理
- `ChatView` 每 30 秒轮询 `/user/tasks/due`（只在页面可见且没有 pending 弹窗时），10 分钟窗口、单轮最多 3 条，点击通知打开任务 tab
- `ChatSidebar` 暴露 `openTasks()` 供通知点击跳转；通知样式走全局 `.mb-due-notification`
- 新增 `tests/dueTasks.test.js`（4 个用例）；前端测试总数 41
- 去掉确认弹窗的全屏 `backdrop-filter`（改为半透明纯色遮罩），面板入场动画 0.28s → 0.18s，支持 `prefers-reduced-motion`
- 确认/取消成功后关闭等待从 1200ms/900ms 降到 450ms/300ms，并立即停止倒计时
- 确认成功后不再硬编码“好的，都帮你设好了”，改为展示后端 `ConfirmResult.receipt`（实际写入历史的人设化回执）
- 侧栏任务/记忆刷新推迟到 `requestIdleCallback`（600ms 超时兜底），避免确认瞬间 4 个请求 + 大列表重渲染
- 回执气泡是纯文本，不再全量扫描消息容器挂代码复制按钮
- 记忆删除文案改为“只影响后续回复，不会改写聊天记录”；`style` 标签改为“回答风格”
- 任务弹窗与侧栏提示当前只做应用内记录，不会主动发 QQ / 微信
- `npm test` 37/37，`npm run build` 通过

**P1.5 侧边栏任务与记忆（Trae 式布局）**

- `ChatSidebar` 增加「会话 / 任务」双 tab；任务 tab 展示待办/完成/取消筛选、完成、删除，并通过 `createdFromSession` 回到发起会话
- 记忆按 `sessionId` 分组：会话行显示本会话记忆条数，当前会话可展开直接管理；全局记忆固定在会话列表上方
- `ChatView` 统一加载三种任务状态 + 全量记忆，新增任务/记忆操作与刷新；确认 pending 成功、删除会话后同步刷新侧栏
- 移除 `localStorage.currentSessionId` 跨页同步；设置页删除重复的 MindButler 管理卡片，历史页删除会话时不再维护本地会话 id
- 新增 `MemoryList.vue` / `SidebarTasks.vue` / `utils/sidebar.js`；`npm test` 37/37 通过，`npm run build` 通过

**应用内到期提醒（dueTasks）**

- 新增 `src/utils/dueTasks.js`：到期通知选择、`taskId + dueAt` 去重、localStorage 记录清理
- `ChatView` 每 30 秒轮询 `/user/tasks/due`（只在页面可见且没有 pending 弹窗时），10 分钟窗口、单轮最多 3 条，点击通知打开任务 tab
- `ChatSidebar` 暴露 `openTasks()` 供通知点击跳转；通知样式走全局 `.mb-due-notification`
- 新增 `tests/dueTasks.test.js`（4 个用例）；前端测试总数 41

**登录流程简化与视觉重构**

- `login/index.vue` 视觉重构：玻璃拟态卡片 + 背景光斑、`Transition` 步骤切换左右滑动过渡、logo 漂浮动画、输入框跟随主题
- 新用户判定改为 `/user/me` 返回的 `isNewUser` 字段，移除独立 `checkIsNewUser`（`/user/is-new-user`）调用
- 密码规则改为 `^[A-Za-z0-9_]{4,32}$`（4-32 位字母/数字/下划线），提示文案同步更新
- 503 短信服务不可用（dev 模式没接供应商）时引导改用密码登录，不进 60s 冷却；60s 冷却仅在后端 400 且 message 含"频繁"时启动
- 设置密码步骤去掉昵称输入（昵称在设置页改），步骤提示改为"需重新获取一次验证码"
- `history/index.vue` 视觉重构：卡片化 + motion-v 入场动画 + 模型标签 + 空状态 CTA + 删除时级联清理本地 `currentSessionId`
- `request.js` 新增 `503` 错误文案（短信服务不可用，请改用密码登录或联系管理员）

**记忆会话隔离 P1.3**

- `api/user.js` 的 `getMemories` 增加 `sessionId` 参数，传 sessionId 时只返回「全局 + 当前会话」的记忆（P1.3 会话隔离），不传则全量
- 设置页记忆面板带 `localStorage.currentSessionId`，`mbLoadMemories` 传当前会话 id
- `ChatView` 维护 `localStorage.currentSessionId`：选中会话时 set，删除当前会话时 remove（避免设置页拿到过期会话）

## 变更记录（2026-11-04）

**MindButler P1 接口与任务/记忆管理**

- `api/user.js` 补全 P1 接口：
  - 任务：`getDueTasks` / `getTasks`（游标分页）/ `getTask` / `createTask` / `updateTask`（乐观锁）/ `completeTask`（once→done，daily/weekly 滚动到下次）/ `deleteTask`
  - 记忆：`getMemories` / `exportMemories` / `getMemory` / `createMemory` / `updateMemory`（乐观锁）/ `deleteMemory`
  - 待确认动作：`getCurrentPendingAction` / `getPendingAction` / `confirmPendingAction` / `rejectPendingAction`
- 设置页新增「MindButler · 记忆与任务」卡片：
  - 任务 tab：待办/已完成/已取消过滤 + 完成 + 删除；完成任务走乐观锁，列表没带 version 时先拉单条拿最新 version，409 提示刷新重试
  - 记忆 tab：生效记忆列表 + 删除；展示 key / memType / scope（会话/全局，v7.4 兼容旧 `sessionId`）/ status / 到期时间
  - 任务日期用 `formatDueAt`（`parseLocalDateTime` 字面量解析无时区 LocalDateTime），避免浏览器当 UTC 偏移 8 小时
- `TaskConfirmDialog` 补全记忆条目渲染（key 标签、值、scope、长期/动态 memType），pending 数据为空时展示「确认已失效」空态

## 变更记录（2026-11-03）

**聊天任务弹窗**

- 新增 `TaskConfirmDialog.vue`：任务/记忆候选展示、10 分钟倒计时、过期/已处理/成功状态、桌面居中 + 移动端底部抽屉
- 新增 `utils/pending.js`：`extractPendingId` / `stripMbMarker` / LocalDateTime 解析 / 重复规则 / 倒计时 / 弹窗文案
- `ChatView`：SSE 完成后提取 pendingId 并打开弹窗；刷新/切回会话用 `/user/pending-actions/current` 恢复；弹窗打开时禁用输入；收起后保留“去确认”提醒条
- `ChatMessage` 移除旧的 inline 确认卡片，统一由全局弹窗承载；复制/导出前剥离机器标记
- `ChatComposer` 增加 `disabled` 状态；新增 `tests/pending.test.js`（31 个测试全绿）

## 变更记录（2026-10-28）

**结构拆分**

- `ChatView.vue` 从 2300+ 行降到约 1050 行
- 新增 `ChatSidebar`（会话搜索/重命名/删除/用户卡）、`ChatMessage`（气泡/模型/复制/动画）、`ChatComposer`（模型/输入/发送）、`WelcomeScreen`（空状态/快捷问题）
- 拆分后聊天、409、重命名/删除、空状态、移动端与深色模式 E2E 全部通过


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

- `npm test`：41/41 通过（9 个 SSE 解析 + 8 个代码围栏边界 + 4 个代码高亮 + 10 个待确认动作 + 6 个侧栏任务/记忆 + 4 个到期提醒）
- `npm run build`：通过
- Headless 浏览器实测：流式输出、停止生成、刷新历史、会话管理、登录容错均正常
