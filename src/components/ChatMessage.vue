<template>
  <motion.div
    :class="['message', message.role === 'user' ? 'user-message' : 'ai-message']"
    initial="hidden"
    :animate="message.role === 'ai' && message.streaming ? 'streaming' : 'shown'"
    :variants="messageVariants"
  >
    <el-avatar :size="40" :class="message.role === 'user' ? 'user-avatar' : 'ai-avatar'">
      <el-icon v-if="message.role === 'ai'"><ChatDotRound /></el-icon>
      <span v-else>我</span>
    </el-avatar>
    <div class="message-content">
      <div class="message-header">
        <span class="sender-name">{{ message.role === 'user' ? '你' : 'AI 助手' }}</span>
        <span v-if="message.role === 'ai' && message.model" class="message-model">{{ message.model }}</span>
        <span v-if="message.streaming" class="message-streaming"><i></i>正在生成</span>
        <span v-else-if="message.timestamp" class="message-time">{{ formatTime(message.timestamp) }}</span>
      </div>
      <div class="message-bubble">
        <StreamingMarkdown
          v-if="message.role === 'ai'"
          :content="message.content"
          :streaming="!!message.streaming"
        />
        <p v-else class="plain-text">{{ message.content }}</p>
      </div>
      <div class="message-actions" v-if="!message.streaming">
        <el-button text size="small" @click="emit('copy', message.content)">
          <el-icon><CopyDocument /></el-icon>
          复制
        </el-button>
      </div>
    </div>
  </motion.div>
</template>

<script setup>
import { ChatDotRound, CopyDocument } from '@element-plus/icons-vue'
import { motion } from 'motion-v'
import StreamingMarkdown from '@/components/StreamingMarkdown.vue'

defineProps({
  message: { type: Object, required: true }
})

const emit = defineEmits(['copy'])

const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  shown: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
  },
  streaming: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.2, ease: 'easeOut' }
  }
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`

  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.message {
  display: flex;
  gap: 12px;
  max-width: 82%;
  animation: messageIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message.user-message {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.ai-message {
  align-self: flex-start;
}

.user-avatar {
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
}

.ai-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 4px 14px rgba(245, 87, 108, 0.3);
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.user-message .message-header {
  flex-direction: row-reverse;
}

.sender-name {
  font-weight: 600;
  color: var(--text-secondary);
}

.message-model {
  max-width: 150px;
  padding: 1px 7px;
  border-radius: 20px;
  border: 1px solid rgba(99, 102, 241, 0.18);
  background: rgba(99, 102, 241, 0.08);
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-bubble {
  padding: 14px 18px;
  border-radius: var(--radius-lg);
  font-size: 15px;
  line-height: 1.65;
  word-break: break-word;
  position: relative;
}

.user-message .message-bubble {
  background: var(--bubble-user-bg);
  color: var(--bubble-user-text);
  border-radius: 18px 18px 6px 18px;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
}

.ai-message .message-bubble {
  background: var(--bubble-ai-bg);
  color: var(--bubble-ai-text);
  border: 1px solid var(--bubble-ai-border);
  border-radius: 18px 18px 18px 6px;
  box-shadow: var(--bubble-ai-shadow);
}

.plain-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}

.message-actions {
  display: flex;
  gap: 4px;
  padding: 0 2px;
  margin-top: 2px;
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.message:hover .message-actions,
.message:focus-within .message-actions {
  opacity: 1;
  transform: translateY(0);
}

.user-message .message-actions {
  justify-content: flex-end;
}

.message-actions .el-button {
  height: 28px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--text-tertiary);
  font-size: 12px;
  transition: all 0.2s ease;
}

.message-actions .el-button:hover {
  color: var(--color-primary);
  border-color: var(--border-subtle);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.message-streaming {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 500;
}

.message-streaming i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: statusPulse 1.1s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% { opacity: 0.35; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
}

@media (max-width: 768px) {
  .message {
    max-width: 94%;
  }
}
</style>
