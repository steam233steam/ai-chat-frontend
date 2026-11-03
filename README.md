# AI 聊天前端

[![Frontend CI](https://github.com/steam233steam/ai-chat-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/steam233steam/ai-chat-frontend/actions/workflows/ci.yml)

基于 Vue 3 + Vite + Element Plus 的 AI 聊天系统前端，对接 Spring Boot 后端（API v7.2，MindButler P1：长期记忆 + 口语化任务 + 待确认动作）。

## 功能特性

- **登录注册**：手机号验证码登录，新用户首次登录强制设置密码（两次验证码流程）
- **流式对话**：SSE 打字机效果逐字显示，**已定型前缀 + 未定型尾巴**两级渲染，长消息流式期间每帧渲染成本恒定；未闭合代码块不会闪烁；支持随时停止生成
- **打字机引擎**：LobeChat 式 buffer + queue + 匀速消费，30fps 吐字，已定型前缀渲染一次后冻结
- **代码高亮**：highlight.js 按需注册 18 种语言（js/ts/python/java/go/rust/c/cpp/csharp/bash/sql/json/xml/yaml/css/markdown/diff），未知语言回退纯文本转义；vue/html 映射 xml
- **模型选择**：调用 `/chat/models` 拉取白名单模型，会话内模型锁定，消息气泡显示模型标签
- **会话管理**：新建 / 切换 / 重命名（限 50 字）/ 删除 / 导出（JSON、纯文本），侧边栏支持搜索对话
- **历史分页**：`limit` + `beforeId` 游标分页，滚动到顶部加载更早记录
- **Markdown 渲染**：代码块带一键复制按钮 + 语言标签，Clipboard API 不可用时降级 `execCommand`，内容经 DOMPurify 净化
- **暗色模式**：双主题（CSS 变量 + `html[data-theme]`），设置页与顶部工具栏均可切换，偏好持久化到 localStorage
- **动效**：motion-v 入场/退场动画（AnimatePresence / motion.div）
- **响应式布局**：PC 与移动端自适应，侧边栏可折叠
- **离线提示**：网络状态检测，断网时顶部横幅提示
- **聊天建任务**：聊天里说“明天下午三点提醒我开会”会命中意图提取，流式结束后自动弹出任务确认弹窗；确认后才写入任务列表，取消/稍后处理不会落库；刷新或切回会话会用 `/user/pending-actions/current` 恢复未处理提案

## 快速开始

```bash
npm install
npm run dev        # 开发服务器 http://localhost:5173，/api 代理到 localhost:8080
```

## 构建与部署

```bash
npm run build      # 产物输出到 dist/
```

生产环境使用 `nginx/ai-chat.conf` 作为配置模板：

- 静态资源服务（带 hash 的产物 1 年强缓存）
- SPA 路由回退（`try_files` 到 `index.html`）
- `/api` 反向代理到后端，自动去掉 `/api` 前缀
- SSE 关键配置：`proxy_buffering off`、`Accept-Encoding identity`、`proxy_read_timeout 300s`

修改配置中的 `root` 路径后放入 nginx 的 `conf/` 目录并在 `nginx.conf` 中 `include` 即可。同域名部署时无需配置 CORS。

开发环境 `vite.config.js` 已配置 `manualChunks` 分包（vue / element-plus / markdown / axios），并对 SSE 代理请求自动去掉 `Accept-Encoding`、加上 `Cache-Control: no-cache`。

## 环境变量

| 文件 | 说明 |
|------|------|
| `.env.development` | 开发环境，`VITE_API_BASE_URL` 指向本地后端 |
| `.env.production` | 生产占位符，跨域部署时改为真实后端地址 |

## 接口封装约定

`src/api/request.js` 中的 Axios 实例：

- 请求拦截器自动附加 `Authorization`（token 存于 `localStorage.token`）
- 响应拦截器统一解析 `code === 200` 的业务响应：
  - `401`：清除本地登录态并跳转 `/login`
  - `409`：会话模型冲突，提示新建会话
  - `400/500` 等业务错误：以带 `code` 的 `business` 错误抛给调用方，由页面自行提示，避免全局弹窗干扰流式请求等场景
- 兼容无 `code` 字段的旧接口（原样返回）

## 流式响应说明

- **`src/utils/sse.js`**：极简 SSE 解析器 `SSEParser`，兼容 `\n\n`、`\r\n\r\n`、`\r\r` 事件分隔符；保留 `data:` 内容的原始空格（不 trim），避免模型输出英文单词粘连；`flush()` 处理连接截断时最后一段缺失空行的事件；收到 `[DONE]` 后自动 `stop()`
- **`src/utils/fence.js`**：Markdown 代码围栏工具。`findUnclosedFence` 扫描未闭合的 ``` / ~~~；`findStableBoundary` 计算可安全冻结的 stable 前缀长度，保证 stable 段始终处于围栏平衡状态（不把一个代码块拆成两段渲染）
- **`src/utils/markdown.js`**：`renderStreamingMarkdown` 在流式输出中检测到未闭合围栏时补一个临时闭合符再交给 marked，避免代码块闪烁；`copyText` 在非 HTTPS 环境降级 `execCommand`
- **`src/utils/codeHighlight.js`**：highlight.js 按需注册 18 种语言 + 别名映射（vue/html → xml，c++ → cpp，c# → csharp 等），通过 marked renderer 把代码围栏渲染成带语言标记的高亮块
- **`src/composables/useTypewriter.js`**：打字机引擎。把输出文本拆成「已定型前缀 stable（默认 400 字）」和「未定型尾巴 frontier」——前缀渲染一次后冻结缓存，流式期间每帧只渲染最近 400 字，渲染成本 O(stableLength) 而非 O(全文)

## 目录结构

```
src/
├── api/          # request.js（Axios 封装）+ chat.js + user.js
├── router/       # 路由与登录守卫
├── views/        # chat / login / history / settings / 404 / layout
├── components/   # ChatSidebar / ChatMessage / ChatComposer / StreamingMarkdown /
│                 # TaskConfirmDialog / WelcomeScreen / OfflineBanner
├── composables/  # useNetwork / useTypewriter / useTheme
├── assets/       # design.css（设计 token，明暗双主题）+ main.css
└── utils/        # markdown.js、pending.js、codeHighlight.js、fence.js、sse.js
```

**设计系统**（`src/assets/design.css`）：LobeChat 风格，定义品牌色、背景、文本、边框、气泡、代码块、阴影、圆角、玻璃拟态等 CSS 变量；`html[data-theme='dark']` 覆盖为深色值；`main.css` 把这些变量映射到 Element Plus 的 `--el-*` 变量，实现组件主题自动跟随。

## 测试

```bash
npm test           # 单元测试（node --test）
```

测试用例（31 个）：

- `tests/sse.test.js`：SSE 解析器 9 个用例（前导空格保留、跨 chunk 分片、CRLF、注释行忽略、`[DONE]`、flush 截断、stop 后静默等）
- `tests/fence.test.js`：围栏工具 8 个用例（平衡/未闭合、~~~ 支持、区间扫描、换行切分、不切开未闭合代码块、代码块闭合后继续推进等）
- `tests/highlight.test.js`：高亮 4 个用例（已知语言输出 span、未知语言转义、vue/html 映射 xml、无语言纯文本）
- `tests/pending.test.js`：待确认动作 10 个用例（标记提取/剥离、LocalDateTime 解析、日期/重复规则、倒计时、标题/按钮文案、确认结果、SSE 多行 data 提取）

## CI

GitHub Actions 在每次 push 时执行 `npm ci`、`npm test`（上述 31 个用例）和 `npm run build`（`.github/workflows/ci.yml`）。

## 技术栈

Vue 3 · Vite · Element Plus · Vue Router 4 · Axios · marked · DOMPurify · highlight.js · motion-v

## 变更记录

- **v7.2（2026-11-03）**：
  - 聊天触发任务：解析 `/chat/ask-stream` 文案尾部的 `[[MB:pending=N]]`，SSE 结束后自动打开任务确认弹窗
  - `TaskConfirmDialog`：任务/记忆混合确认、倒计时、过期/已处理状态、确认/取消/稍后处理，移动端底部抽屉
  - 刷新/切回会话调用 `/user/pending-actions/current` 恢复未处理提案；弹窗打开时禁用输入，收起后保留“去确认”提醒条
  - `utils/pending.js` + 10 个纯函数测试；历史/复制/导出展示前统一剥离机器标记
- **v5.2（2026-10-28）**：
  - 设计系统：LobeChat 风格双主题（`design.css` + `useTheme` + Element Plus 变量映射）
  - 组件拆分：`ChatView` 拆出 `ChatSidebar` / `ChatMessage` / `ChatComposer` / `StreamingMarkdown` / `WelcomeScreen`
  - 打字机引擎：`useTypewriter`（stable + frontier 两级渲染）+ `fence.js`（围栏平衡检测）
  - 代码高亮：`highlight.js` 按需注册 17 种语言，代码块带语言标签
  - 流式 Markdown：`renderStreamingMarkdown` 未闭合围栏补临时闭合符，避免代码块闪烁
  - 侧边栏搜索、主题切换、消息模型标签、`409` 会话模型冲突处理
  - 新增 21 个单元测试（sse / fence / highlight）
  - `vite.config.js` 加 `manualChunks` 分包 + SSE 代理配置
- **v5.1（2026-10-26）**：模型选择、历史游标分页、8000 字输入限制、顶部工具栏（历史/设置/导出/登出）、业务错误交由页面处理
- **v5.0（2026-10-17）**：SSE 解析器独立成 `utils/sse.js`，支持前导空格保留与 CRLF 兼容
- **v4.0（2026-09-26）**：登录系统重构（验证码 + 密码双模式）、token 独立存储、聊天接口路径统一为 `/chat/*`
