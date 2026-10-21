# 前端待办

## P1 - 功能与规范

- [x] 删除冗余 Axios 实例（`api/index.js` 已移除，统一走 `api/request.js`）
- [ ] 引入 Pinia 状态管理（user / chat / settings store，减轻 ChatView 单文件压力）
- [ ] 设置页与后端打通（新增 `GET/PUT /user/settings`，模型与温度参数传给后端）
- [ ] 长会话消息分页加载（后端 `/chat/history` 支持 `limit/offset`）

## P2 - 工程质量

- [ ] TypeScript 渐进式迁移（先 API 层类型定义，再 store，最后组件）
- [ ] ChatView 组件拆分（Sidebar / MessageList / MessageItem / MessageInput / CodeBlock / WelcomeScreen）
- [x] 路由守卫去重（移除 App.vue 中的 token 检查，统一在 router 守卫处理）
- [ ] 错误边界与全局错误提示（网络错误、API 错误、流式错误统一在消息气泡内展示）
- [x] 环境变量管理（`.env.development` / `.env.production`，Vite 代理读取 `loadEnv`）

## P3 - 体验优化

- [x] 消息时间戳智能格式化（刚刚 / N 分钟前 / 昨天 / MM-DD）
- [ ] 会话标题搜索（侧边栏本地过滤）
- [ ] 暗色模式（CSS 变量 + 设置页切换）
- [ ] PWA 支持（vite-plugin-pwa，离线可用 + 安装到桌面）
- [ ] 长消息列表性能（虚拟滚动或分页）

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

- `npm test`：9/9 通过（SSE 解析）
- `npm run build`：通过
- Headless 浏览器实测：流式输出、停止生成、刷新历史、会话管理、登录容错均正常
