import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'ai-chat-theme'

const getStoredTheme = () => {
  if (typeof localStorage === 'undefined') return 'light'
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch (_) {
    return 'light'
  }
}

// 模块级单例，保证跨组件共享同一主题状态
const theme = ref(getStoredTheme())

const applyTheme = (value) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', value)
  }
}

// 可写 computed：设置页的 v-model 直接绑定 isDark 时必须能写回
const isDark = computed({
  get: () => theme.value === 'dark',
  set: (value) => {
    theme.value = value ? 'dark' : 'light'
  }
})

// 模块级监听：多个页面同时使用 useTheme 时也只注册一次
watch(
  theme,
  (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch (_) {
      // 隐私模式 / 存储被禁用时仅影响持久化，不影响本次切换
    }
    applyTheme(value)
  },
  { immediate: true }
)

/** 在应用挂载前调用，保证登录页 / 404 等未使用 useTheme 的页面也能恢复主题 */
export function initTheme() {
  applyTheme(theme.value)
}

export function useTheme() {
  const toggle = () => {
    theme.value = isDark.value ? 'light' : 'dark'
  }

  const set = (value) => {
    theme.value = value
  }

  return {
    theme,
    isDark,
    toggle,
    set
  }
}
