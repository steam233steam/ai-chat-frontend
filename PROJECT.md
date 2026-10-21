# AI 聊天系统

基于 Spring Boot + Spring AI + Ollama 的全栈 AI 对话助手，支持手机号验证码登录、流式 AI 对话、多会话管理、历史记录。

## 项目结构

| 仓库 | 说明 |
|------|------|
| `spring--ai--` | 前端（Vue 3 + Element Plus），本仓库 |
| `spring--ai---` | 后端（Spring Boot + Redis + MySQL） |

## 核心功能

- 手机号验证码登录 + 新用户首次强制设置密码
- SSE 流式输出，逐字显示 AI 回复，可随时停止
- 多会话管理：新建 / 切换 / 重命名 / 删除 / 清空
- 对话导出（JSON / 纯文本）、Markdown 代码块复制
- 响应式布局，PC + 移动端自适应

## 技术栈

Vue 3 · Vite · Element Plus · Vue Router 4 · Axios · marked · DOMPurify

## 快速开始

```bash
npm install
npm run dev
```

更多说明见 [README.md](./README.md)。
