import { createRouter, createWebHistory } from 'vue-router'

// 懒加载路由
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', needAuth: false }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/views/layout/index.vue'),
    redirect: '/chat',
    children: [
      {
        path: 'chat',
        name: 'Chat',
        component: () => import('@/views/ChatView.vue'),
        meta: { title: 'AI 对话', needAuth: true }
      },
      {
        path: 'chat/:id',
        name: 'ChatDetail',
        component: () => import('@/views/ChatView.vue'),
        meta: { title: 'AI 对话', needAuth: true }
      },
      {
        path: 'history',
        name: 'History',
        component: () => import('@/views/history/index.vue'),
        meta: { title: '对话历史', needAuth: true }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/index.vue'),
        meta: { title: '设置', needAuth: true }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/404.vue'),
    meta: { title: '404', needAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - AI助手` : 'AI助手'
  
  // 获取登录状态（使用新的 Token 存储）
  const token = localStorage.getItem('token')
  const isAuthenticated = !!token
  
  // 需要登录的页面
  if (to.meta.needAuth === true) {
    if (!isAuthenticated) {
      next('/login')
    } else {
      next()
    }
  } else {
    // 不需要登录的页面
    if (isAuthenticated && to.path === '/login') {
      // 已登录用户访问登录页，跳转到聊天页
      next('/chat')
    } else {
      next()
    }
  }
})

export default router
