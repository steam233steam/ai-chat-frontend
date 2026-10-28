import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { MotionPlugin } from 'motion-v'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import './assets/main.css'

const app = createApp(App)
app.use(MotionPlugin)
app.use(router)
app.mount('#app')
