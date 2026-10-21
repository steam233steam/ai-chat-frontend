<template>
  <transition name="offline-slide">
    <div v-if="!isOnline" class="offline-banner">
      <div class="banner-content">
        <el-icon :size="16"><Warning /></el-icon>
        <span>网络连接已断开，请检查网络后重试</span>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { Warning } from '@element-plus/icons-vue'
import { useNetwork } from '@/composables/useNetwork'

const { isOnline } = useNetwork()
</script>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #f56c6c;
  color: white;
  padding: 8px 16px;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.offline-slide-enter-active,
.offline-slide-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.offline-slide-enter-from,
.offline-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
