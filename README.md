# AI 聊天前端

基于 Vue 3 + Vite + Element Plus 的 AI 聊天系统前端，对接 Spring Boot 后端（API v5.0，Redis + MySQL + Ollama）。

## 功能特性

- **登录注册**：手机号验证码登录，新用户首次登录强制设置密码（两次验证码流程）
- **流式对话**：SSE 打字机效果，逐字显示 AI 回复，支持随时停止生成
- **会话管理**：新建 / 切换 / 重命名 / 删除 / 清空 / 导出（JSON、纯文本）
- **Markdown 渲染**：代码块带一键复制按钮，内容经 DOMPurify 净化
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

## 目录结构

```
src/
├── api/          # request.js（Axios 封装）+ chat.js + user.js
├── router/       # 路由与登录守卫
├── views/        # chat / login / history / settings / 404
├── components/   # OfflineBanner 等
├── composables/  # useNetwork
└── utils/        # markdown 渲染、SSE 解析、导出
```

## 测试

```bash
npm test           # SSE 解析单元测试（node --test）
```

## 技术栈

Vue 3 · Vite · Element Plus · Vue Router 4 · Axios · marked · DOMPurify
