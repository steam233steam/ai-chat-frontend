# AI 聊天前端（MindButler）

[![Frontend CI](https://github.com/steam233steam/ai-chat-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/steam233steam/ai-chat-frontend/actions/workflows/ci.yml)

Vue 3 + Vite + Element Plus 做的聊天前端，对接 [ai-chat-backend](https://github.com/steam233steam/ai-chat-backend)（Spring Boot）。
除了聊天，还负责把后端的 "MindButler" 能力呈现出来：**长期记忆、口语化任务、待确认动作、应用内到期提醒、MCP 工具调用**。

---

## 它长什么样

一次对话的路径：

```
登录（验证码 / 密码）
  → 选模型 → 发消息
  → SSE 逐字显示（打字机：已定型前缀冻结 + 未定型尾巴重渲染）
  → 如果后端识别出"要记住 / 要提醒"的意图，消息尾部带 [[MB:pending=N]]
  → 流结束后自动弹确认弹窗 → 确认才落库，取消/稍后不落库
  → 侧边栏「会话 / 任务」两个 tab，记忆按会话分组
```

## 功能

- **登录**：验证码 + 密码双模式，新用户强制设密码；503（短信未配置）时引导改用密码登录
- **流式对话**：SSE 打字机，长消息每帧只渲染最近 400 字；未闭合代码块不闪烁；随时可停止
- **Markdown + 高亮**：marked + DOMPurify 净化，highlight.js 按需注册 18 种语言，代码块一键复制
- **模型选择**：`/chat/models` 拉白名单，会话内锁模型，气泡显示模型标签，冲突返回 409
- **待确认弹窗**：任务 / 记忆 / 混合三种模式，倒计时、幂等确认、过期恢复、Esc/Enter 快捷键、移动端底部抽屉
- **侧边栏**：会话列表（搜索、重命名、导出、删除）+ 任务 tab（筛选、完成、删除、跳回来源会话）；记忆按 `sessionId` 分组
- **到期提醒**：页面可见时 30 秒轮询 `/user/tasks/due`，10 分钟内到期才弹，按 `taskId + dueAt` 去重
- **历史分页**：`limit` + `beforeId` 游标，滚到顶部加载
- **暗色模式**：CSS 变量 + `html[data-theme]`，跟随 Element Plus 变量，偏好存 localStorage
- **响应式 + 离线提示**：侧边栏可折叠，断网顶部横幅

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173，/api 代理到 http://localhost:8080
```

后端要先起着：`./mvnw.cmd -o spring-boot:run`（见后端 `docs/本地启动.md`）。

登录方式二选一：密码登录，或往 Redis 种一个 token（后端文档有脚本）。

## 文档

| 我想…… | 看这份 |
|---|---|
| 部署到服务器 | [`docs/部署.md`](docs/部署.md) — nginx 配置、SSE 三个关键点、验证清单、常见故障 |
| 知道还没做什么 | [`docs/待办.md`](docs/待办.md) — 只留未完成项 |
| 查某个版本改了什么 | [`docs/变更记录.md`](docs/变更记录.md) — v4.0 ~ v7.6 |

## 构建

```bash
npm run build      # dist/
npm test           # 41 个纯函数单测
```

生产用 [`nginx/ai-chat.conf`](nginx/ai-chat.conf)：静态 1 年强缓存、SPA fallback、`/api` 反代、SSE 关缓冲。完整步骤见 [`docs/部署.md`](docs/部署.md)。

## 环境变量

| 文件 | 用途 |
|---|---|
| `.env.development` | 开发环境 `VITE_API_BASE_URL`，供 Vite 代理使用 |
| `.env.production` | 生产固定同源 `/api`，由 nginx 反代；此变量不参与生产 baseURL |

## 接口封装约定

`src/api/request.js`：

- 请求拦截器附加 `Authorization`（裸 token，存 `localStorage.token`）
- `code === 200` 视为业务成功；`401` 清登录态跳 `/login`；`409` 提示会话模型冲突；`400/500` 抛带 `code` 的 `business` 错误，交给页面自己提示（避免全局弹窗打断流式）
- 兼容无 `code` 字段的旧接口

`src/api/user.js` 覆盖 `/user/code`、`/user/login`、`/user/login/password`、`/user/set-password`、`/user/me`、`/user/profile`、`/user/logout`，以及 MindButler 的任务 / 记忆 / 待确认动作全套接口。

## 流式实现要点

| 文件 | 干什么 |
|---|---|
| `utils/sse.js` | 极简 SSE 解析器：兼容 `\n\n`/`\r\n\r\n`/`\r\r`，**保留 `data:` 后原始空格**（否则英文单词会粘），`flush()` 处理截断，`[DONE]` 自动停 |
| `utils/fence.js` | 扫描未闭合代码围栏，算「可安全冻结的 stable 前缀」，保证不把代码块切成两段 |
| `composables/useTypewriter.js` | stable（默认 400 字）+ frontier 两级渲染，流式期间渲染成本恒定 |
| `utils/pending.js` | `[[MB:pending=N]]` 提取/剥离、无时区 `LocalDateTime` 解析（避免浏览器当 UTC 差 8 小时）、倒计时与文案 |
| `utils/dueTasks.js` | 到期提醒纯函数：occurrence key、10 分钟窗口、去重限流、记录清理 |
| `components/TaskConfirmDialog.vue` | 确认弹窗状态机：加载骨架 / 倒计时 / 确认 / 取消 / 过期；确认后展示后端返回的人设化 `receipt` |

## 目录结构

```
src/
├── api/          request.js + chat.js + user.js
├── router/       路由与登录守卫
├── views/        chat / login / history / settings / 404 / layout
├── components/   ChatSidebar / ChatMessage / ChatComposer / StreamingMarkdown /
│                 TaskConfirmDialog / WelcomeScreen / OfflineBanner / MemoryList / SidebarTasks
├── composables/  useNetwork / useTypewriter / useTheme
├── assets/       design.css（设计 token，明暗双主题）+ main.css
└── utils/        markdown / pending / sidebar / dueTasks / codeHighlight / fence / sse
```

## 测试与 CI

`npm test`（node --test）41 个用例，全部是纯函数：`sse`(9) `fence`(8) `highlight`(4) `pending`(10) `sidebar`(6) `dueTasks`(4)。
GitHub Actions 每次 push 跑 `npm ci` + `npm test` + `npm run build`。

## 技术栈

Vue 3 · Vite · Element Plus · Vue Router 4 · Axios · marked · DOMPurify · highlight.js · motion-v

## 变更记录

见 [`docs/变更记录.md`](docs/变更记录.md)。
