import { ref, computed, onMounted, watch } from 'vue'

const STORAGE_KEY = 'ai-chat-theme'

// 模块级单例，保证跨组件共享同一主题状态
const theme = ref(localStorage.getItem(STORAGE_KEY) || 'light')

const isDark = computed(() => theme.value === 'dark')

const applyTheme = (value) => {
  document.documentElement.setAttribute('data-theme', value)
}

export function useTheme() {
  onMounted(() => {
    applyTheme(theme.value)
  })

  watch(theme, (value) => {
    localStorage.setItem(STORAGE_KEY, value)
    applyTheme(value)
  })

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
