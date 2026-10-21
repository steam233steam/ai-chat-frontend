# 前端优化方案

> 基于当前代码审查，按优先级排列。P0 已修复，P1~P3 待处理。

---

## P1：功能缺陷与规范问题（建议尽快改）

### 1. 删除冗余 Axios 实例

**现状**：`src/api/request.js` 和 `src/api/index.js` 两个 Axios 实例，功能几乎一样，`index.js` 没被任何地方引用。

**方案**：删掉 `src/api/index.js`，统一用 `request.js`。

**检查方式**：
```bash
rg "from.*api/index" src/
rg "from.*api['\"]" src/
```
确认没有引用后再删。

---

### 2. 引入 Pinia 状态管理

**现状**：用户信息、会话列表、当前会话 ID 全靠组件内 `reactive` 和 `localStorage`，跨组件通信靠路由参数。

**问题**：
- `ChatView` 里用户信息、会话列表、消息列表全堆在一个组件，近 600 行
- 历史页和聊天页各自独立加载会话列表，不共享
- 用户信息在 `localStorage` 和组件 reactive 之间手动同步，容易不一致

**方案**：
```
src/stores/
├── userStore.js       — 用户信息、登录态、登出
├── chatStore.js       — 会话列表、当前会话、消息列表
└── settingsStore.js   — 设置项（API 地址、模型等）
```

`userStore` 示例：
```js
export const useUserStore = defineStore('user', () => {
  const userInfo = ref(null)
  const token = ref(localStorage.getItem('token') || '')

  function setToken(t) {
    token.value = t
    localStorage.setItem('token', t)
  }
  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('loginUser')
  }
  return { userInfo, token, setToken, logout }
})
```

改造后 `ChatView` 可以大幅瘦身，把数据逻辑移到 store。

---

### 3. 设置页与后端打通

**现状**：设置页的 API 地址、API Key、模型、温度全存 `localStorage`，后端完全不知道，AI 调用参数写死在 `application.properties`。

**方案**：
- 后端加 `GET /user/settings` 和 `PUT /user/settings` 接口
- 前端 `settingsStore` 管理设置项
- 后端 AI 调用时从用户设置中读取模型和温度参数

或者简化版：只把模型和温度传给后端，在 `ask` 请求里带参数。

---

### 4. 消息列表虚拟滚动

**现状**：消息列表全量渲染 DOM，超过 100 条开始卡。

**方案**：
- 方案 A：用 `vue-virtual-scroller` 组件
- 方案 B：自己实现"只渲染可视区域 + 上下缓冲"
- 方案 C：分页加载（每次只加载最近 20 条，向上滚触发加载更多）

建议先用方案 C（分页加载），简单够用。后端 `/chat/history` 加 `limit` 和 `offset` 参数。

---

## P2：代码质量与工程规范

### 5. TypeScript 迁移

**现状**：纯 JavaScript，没有类型约束。

**方案**：渐进式迁移
1. `vue-tsc` + `tsconfig.json` 初始化
2. 先改 API 层（`chat.js` → `chat.ts`），定义接口类型
3. 再改 Store 层
4. 最后改 Vue 组件

核心类型定义：
```ts
interface Message {
  id: number
  role: 'user' | 'ai'
  content: string
  timestamp: Date
  streaming?: boolean
}

interface Session {
  sessionId: string
  title: string
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}
```

---

### 6. 组件拆分

**现状**：`ChatView.vue` 一个文件近 600 行，包含侧边栏、消息列表、输入框、右键菜单等全部逻辑。

**方案**：
```
src/components/chat/
├── Sidebar.vue           — 会话列表 + 新建 + 右键菜单
├── MessageList.vue       — 消息渲染 + 滚动 + 回到底部按钮
├── MessageItem.vue       — 单条消息（用户/AI 分开渲染）
├── MessageInput.vue      — 输入框 + 发送/停止按钮
├── CodeBlock.vue         — 代码块 + 复制按钮
└── WelcomeScreen.vue     — 空状态欢迎页
```

`ChatView.vue` 只做布局组合和数据协调，不超过 100 行。

---

### 7. 路由守卫优化

**现状**：`App.vue` 里 `onMounted` 检查 token 跳转，和 `router/index.js` 的守卫重复。

**方案**：删掉 `App.vue` 里的 token 检查逻辑，完全由路由守卫处理。

---

### 8. 错误边界

**现状**：API 错误靠 `try/catch + console.error`，用户看不到友好提示。

**方案**：
- 全局错误边界组件（`ErrorBoundary.vue`）
- 网络错误统一由 `OfflineBanner` + retry 处理
- API 错误由 axios 拦截器统一 `ElMessage.error`
- 流式错误在 `onError` 回调里显示在消息气泡中

---

### 9. 环境变量管理

**现状**：`vite.config.js` 里 proxy target 硬编码 `localhost:8080`。

**方案**：
```
.env.development   — VITE_API_BASE_URL=http://localhost:8080
.env.production    — VITE_API_BASE_URL=（生产域名）
```

`vite.config.js`：
```js
proxy: {
  '/api': {
    target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
    ...
  }
}
```

---

## P3：体验优化与加分项

### 10. 消息时间戳显示优化

**现状**：时间戳显示为 `new Date()` 的默认格式（`2026-09-27T10:30:00.000Z`）。

**方案**：用 `dayjs` 或手写格式化函数
- 1 分钟内 → "刚刚"
- 1 小时内 → "N 分钟前"
- 今天 → "HH:mm"
- 昨天 → "昨天 HH:mm"
- 更早 → "MM-DD HH:mm"

---

### 11. 对话搜索

**方案**：
- 侧边栏加搜索框
- 前端本地搜（按标题模糊匹配）
- 或后端加 `GET /chat/sessions?keyword=xxx`

---

### 12. 暗色模式

**现状**：CSS 里有 `prefers-color-scheme: dark` 的变量定义，但没有实际适配。

**方案**：
- 加 `data-theme="dark"` 切换
- 用 CSS 变量统一管理配色
- 设置页加"深色/浅色/跟随系统"选项

---

### 13. PWA 支持

**方案**：`vite-plugin-pwa`，支持离线打开、安装到桌面。

---

### 14. 性能优化清单

| 项 | 说明 |
|----|------|
| 路由懒加载 | `() => import('@/views/ChatView.vue')` 已有，保持 |
| 图片懒加载 | AI 头像等小图不需要，大图加 `loading="lazy"` |
| 防抖节流 | 输入框防抖、滚动节流已有，保持 |
| 按需导入 | Element Plus 按需导入已完成 |
| 代码分包 | `manualChunks` 已配置，保持 |
| Markdown 渲染优化 | 流式中纯文本、完成后渲染 Markdown，已完成 |

---

## 本次修复记录（2026-10-17）

### 功能缺陷
1. **SSE 解析抽取到 `src/utils/sse.js`**：原实现对每行 `data:` 做 `trim()`，会吃掉模型 token 的前导空格（`"Hello"` + `" world"` → `"Helloworld"`）；同时补齐 CRLF、`[DONE]`、跨 chunk 截断处理，并新增 9 个单测（`npm test`）。
2. **ChatView 路由同步**：浏览器前进/后退切换会话时组件被复用、消息不刷新，现用 `watch(route.params.id)` 同步；新会话 ID 会写进地址栏（`/chat/:id`），刷新不丢会话。
3. **停止生成**：中断后消息一直停在 `streaming` 状态（纯文本、不渲染 Markdown），现在会收尾成 Markdown 并同步会话标题。
4. **历史消息代码块复制按钮**：`enhanceCodeBlocks` 在 `isLoading` 置 false 之前执行，此时 DOM 里还没有消息；改为渲染完成后再挂载。
5. **删除会话**：后端 `clear-session` 实际删除整个会话，原先前端删除后侧边栏不同步，空会话删除还会静默失败；现在删除后同步列表并自动切到下一个/新会话，移动端按钮语义改为“删除当前对话”。
6. **中文输入法回车**：输入法组词时按 Enter 会误发送，已加 `isComposing` 判断。
7. **登录页**：
   - `prefix-icon="MobilePhone"` 不是 Element Plus 图标（字符串形式也不会被自动注册），图标无法显示；改用 `Iphone / Message / Lock` 组件。
   - 登录、发送验证码失败只 `console.error`，用户看不到提示；现在统一展示 `error.message`。
   - 新用户进入“设置密码”步骤时立即重发验证码，但后端有 60 秒冷却，必然失败且无提示；现在冷却期内不重发，并在页面提示剩余秒数。
8. **环境变量**：`vite.config.js` 里 `process.env.VITE_API_BASE_URL` 读不到 `.env`，改用 `loadEnv(mode)`。

### 工程与体验
9. `useNetwork.js` 原来在模块顶层调用 `onMounted`（告警且无效），改为标准 composable；`OfflineBanner` 接入 `App.vue`，断网提示真正生效。
10. 设置页从“假的 OpenAI 配置（API Key / 模型 / 温度）”改为真实账户设置：读取 `/user/me`、修改昵称（`PUT /user/profile`）、展示接口地址与服务信息。
11. 历史页、设置页加入导航入口（顶栏按钮 + 返回按钮），历史页删除失败会提示原因。
12. 清理 `App.vue` 空 `onMounted`、`layout` 未使用代码、`marked` 已废弃的 `highlight` 选项；复制逻辑统一到 `utils/markdown.js`（非 HTTPS 环境自动降级）。

### 验证
- `npm test`：9/9 通过（SSE 解析）。
- `npm run build`：通过。
- Headless Edge + CDP + mock 后端实测：历史 Markdown 与复制按钮、流式输出（`Hello world` 空格保留）、停止生成、前进后退切换会话、登录错误提示、昵称保存均正常，无 Vue 控制台告警。

---

## 真实后端联调记录（2026-10-17）

环境：VirtualBox 虚拟机 `studybox`（MySQL 13306 / Redis 16379）+ Ollama `qwen2.5-coder:7b` + 后端 8080 + 前端 5173，
启动方式见 `D:\maven-project\aichat\docs\本地启动.md`。

实测通过（Headless Edge + CDP 驱动真实页面）：

- 验证码登录 → 新用户「设置密码」（60 秒冷却提示、重新获取验证码）→ 进入聊天
- 密码登录 → 进入聊天；侧边栏会话列表加载
- 发送消息 → Ollama 真实流式输出 → 结束后 Markdown + 代码块 + 复制按钮
- 刷新页面 → 历史消息、复制按钮恢复；地址栏保持 `/chat/:id`
- 历史页删除会话（真实 `DELETE /chat/clear-session`）
- 设置页读取 `/user/me`、保存昵称（真实 `PUT /user/profile`）
- 会话重命名（真实 `PUT /chat/title`）

额外修复：设置密码成功后刷新 `/user/me` 写回 `loginUser`，避免 localStorage 里 `isNewUser` 长期为 true。
