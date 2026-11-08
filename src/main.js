import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initTheme } from './composables/useTheme'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import './assets/main.css'

// 在首屏渲染前恢复主题，登录页 / 404 等页面同样生效
initTheme()

const app = createApp(App)
app.use(router)
app.mount('#app')
