import { onMounted, onUnmounted, ref } from 'vue'

// 共享的网络状态：所有组件使用同一个 ref 和同一组事件监听
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
let listenerCount = 0

const handleOnline = () => {
  isOnline.value = true
}

const handleOffline = () => {
  isOnline.value = false
}

/**
 * 网络状态 composable，必须在组件 setup 内调用。
 * 多个组件同时使用时只注册一次 window 监听。
 */
export function useNetwork() {
  onMounted(() => {
    if (listenerCount === 0) {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      // 以真实状态为准，避免 SSR/首屏判断偏差
      isOnline.value = navigator.onLine
    }
    listenerCount += 1
  })

  onUnmounted(() => {
    listenerCount = Math.max(0, listenerCount - 1)
    if (listenerCount === 0) {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  })

  return { isOnline }
}
