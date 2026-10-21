# 简单的ai前端（AI 聊天系统）

基于 Vue 3 + Vite + Element Plus 的 AI 聊天系统前端，对接 Spring Boot 后端（API v5.0）。

## 功能

- 手机号验证码登录 / 注册，新用户强制设置密码
- 流式输出（SSE 打字机效果，兼容 Vite 代理和 nginx 部署）
- 会话管理：新建、切换、重命名、删除、清空、导出
- Markdown 渲染、代码块复制
- 响应式：PC + 移动端自适应

## 快速开始

```bash
npm install
npm run dev      # 开发，默认 http://localhost:5173，/api 代理到 localhost:8080
```

## 构建部署

```bash
npm run build    # 产物输出到 dist/
```

- `nginx/ai-chat.conf`：生产环境 nginx 配置模板（静态文件 + SPA 路由 + /api 反代 + SSE 流式输出处理）。修改 `root` 路径后放入 nginx 的 `conf/` 目录并 `include` 即可。
- 生产构建时前端请求走相对路径 `/api`，由 nginx 反向代理到后端；`VITE_API_BASE_URL` 仅 Vite 开发代理使用，同域名部署时无需修改。

## 环境变量

| 文件 | 说明 |
|---|---|
| `.env.development` | 开发环境，`VITE_API_BASE_URL` 指向本地后端 |
| `.env.production` | 生产环境占位符，跨域部署时改为真实后端地址 |

## 技术栈

Vue 3 · Vite · Element Plus · Vue Router 4 · Axios · marked + DOMPurify
