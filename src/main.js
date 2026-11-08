import { createApp } from 'vue'
import App from './App.vue'
import router, { prefetchRoutes } from './router'
import { initTheme } from './composables/useTheme'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import './assets/main.css'

// 在首屏渲染前恢复主题，登录页 / 404 等页面同样生效
initTheme()

const app = createApp(App)
app.use(router)
app.mount('#app')

// 首屏稳定后再预取其它页面，避免和首屏抢带宽
router.isReady().then(prefetchRoutes)
