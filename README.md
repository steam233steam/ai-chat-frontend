# AI 聊天前端

[![Frontend CI](https://github.com/steam233steam/ai-chat-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/steam233steam/ai-chat-frontend/actions/workflows/ci.yml)

基于 Vue 3 + Vite + Element Plus 的 AI 聊天系统前端，对接 [Spring Boot 后端](https://github.com/steam233steam/ai-chat-backend)（API v5.0，Redis + MySQL + Ollama）。

## 功能特性

- **登录注册**：手机号验证码登录，新用户首次登录强制设置密码（两次验证码流程）
- **流式对话**：SSE 打字机效果，逐字显示 AI 回复，支持随时停止生成
- **模型选择**：调用 `/chat/models` 拉取白名单模型，发消息时可指定模型
- **会话管理**：新建 / 切换 / 重命名（限 50 字）/ 删除 / 导出（JSON、纯文本）
- **历史分页**：历史消息按 `limit` + `beforeId` 游标分页加载，滚动到顶部加载更早记录
- **Markdown 渲染**：代码块带一键复制按钮（Clipboard API 不可用时降级 `execCommand`），内容经 DOMPurify 净化
- **输入限制**：单条消息上限 8000 字，超出提示
- **顶部工具栏**：历史记录 / 设置入口、导出下拉、登出，PC 端显示用户头像昵称
- **响应式布局**：PC 与移动端自适应，侧边栏可折叠
- **离线提示**：网络状态检测，断网时顶部横幅提示

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
  - `400/500` 等业务错误：以带 `code` 的 `business` 错误抛给调用方，由页面自行提示，避免全局弹窗干扰流式请求等场景
- 兼容无 `code` 字段的旧接口（原样返回）

## 流式响应说明

`src/utils/sse.js` 提供极简 SSE 解析器 `SSEParser`：

- 兼容 `\n\n`、`\r\n\r\n`、`\r\r` 事件分隔符
- 保留 `data:` 内容的原始空格（不 trim），避免模型输出英文单词粘连
- `flush()` 处理连接截断时最后一段缺失空行的事件
- 收到 `[DONE]` 后自动 `stop()`

`src/api/chat.js` 的 `sendMessageStream` 基于该解析器，支持 AbortController 取消与 401 自动跳转。

## 目录结构

```
src/
├── api/          # request.js（Axios 封装）+ chat.js + user.js
├── router/       # 路由与登录守卫
├── views/        # chat / login / history / settings / 404 / layout
├── components/   # OfflineBanner 等
├── composables/  # useNetwork
└── utils/        # markdown.js（渲染/复制/导出）、sse.js（SSE 解析）
```

## 测试

```bash
npm test           # SSE 解析单元测试（node --test）
```

## CI

GitHub Actions 在每次 push 时执行 `npm ci`、`npm test`（SSE 解析用例）和 `npm run build`（`.github/workflows/ci.yml`）。

## 技术栈

Vue 3 · Vite · Element Plus · Vue Router 4 · Axios · marked · DOMPurify

## 变更记录

- **v5.1（2026-10-26）**：模型选择、历史分页加载、8000 字输入限制、顶部工具栏（历史/设置/导出/登出）、业务错误交由页面处理
- **v5.0（2026-09-17）**：SSE 解析器独立成 `utils/sse.js`，支持前导空格保留与 CRLF 兼容
- **v4.0（2026-09-26）**：登录系统重构（验证码 + 密码双模式）、token 独立存储、聊天接口路径统一为 `/chat/*`
