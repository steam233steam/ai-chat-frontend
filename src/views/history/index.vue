<template>
  <div class="history-container">
    <div class="history-header">
      <div class="history-heading">
        <el-button class="back-btn" @click="router.push('/chat')">
          <el-icon><ArrowLeft /></el-icon>
          返回对话
        </el-button>
        <div class="title-block">
          <h2>对话历史</h2>
          <p class="subtitle">管理你的所有 AI 对话记录</p>
        </div>
      </div>
      <el-button class="new-chat-btn" type="primary" @click="goToChat">
        <el-icon><ChatDotRound /></el-icon>
        新对话
      </el-button>
    </div>

    <el-empty
      v-if="!hasHistory && !loading"
      description="暂无对话历史，去开启一段新对话吧"
    >
      <el-button type="primary" @click="goToChat">
        <el-icon><ChatDotRound /></el-icon>
        开启对话
      </el-button>
    </el-empty>

    <div v-else v-loading="loading" class="history-list">
      <motion.div
        v-for="(chat, i) in chatHistory"
        :key="chat.sessionId"
        class="history-item"
        :initial="{ opacity: 0, y: 16 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ delay: Math.min(i, 10) * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }"
        @click="selectChat(chat.sessionId)"
      >
        <div class="history-icon-wrap">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <div class="history-info">
          <div class="history-title">{{ chat.title || '新会话' }}</div>
          <div class="history-meta">
            <span v-if="chat.model" class="history-model-tag">{{ chat.model }}</span>
          </div>
        </div>
        <div class="history-arrow">
          <el-icon><ArrowRight /></el-icon>
        </div>
        <el-button
          text
          size="small"
          class="delete-btn"
          @click.stop="deleteChat(chat.sessionId)"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </motion.div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  ArrowRight,
  Delete,
  ChatDotRound
} from '@element-plus/icons-vue'
import { motion } from 'motion-v'
import { getSessions, clearSession } from '@/api/chat'

const router = useRouter()
const chatHistory = ref([])
const loading = ref(false)

const hasHistory = computed(() => chatHistory.value.length > 0)

onMounted(() => {
  loadHistory()
})

const loadHistory = async () => {
  loading.value = true
  try {
    const res = await getSessions()
    chatHistory.value = res.code === 200 ? (res.data || []) : []
  } catch (error) {
    console.error('加载历史失败', error)
    chatHistory.value = []
    ElMessage.error(error?.message || '加载历史失败')
  } finally {
    loading.value = false
  }
}

const selectChat = (sessionId) => {
  router.push(`/chat/${sessionId}`)
}

const goToChat = () => {
  router.push('/chat')
}

const deleteChat = async (sessionId) => {
  try {
    await ElMessageBox.confirm('删除后该对话及其消息不可恢复，确定继续吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return // 用户取消
  }

  try {
    await clearSession(sessionId)
    chatHistory.value = chatHistory.value.filter(c => c.sessionId !== sessionId)
    ElMessage.success('已删除')
  } catch (error) {
    console.error('删除失败', error)
    ElMessage.error(error?.message || '删除失败，请稍后重试')
  }
}
</script>

<style scoped>
.history-container {
  padding: 28px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  background: var(--bg-base);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border-subtle);
}

.history-heading {
  display: flex;
  align-items: center;
  gap: 14px;
}

.title-block h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.2px;
}

.title-block .subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-tertiary);
}

.back-btn {
  color: var(--text-secondary);
  border-radius: 10px;
  padding: 8px 12px;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--bg-surface-soft);
  color: var(--color-primary);
}

.new-chat-btn {
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%) !important;
  border: none;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
  transition: all 0.25s;
}

.new-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(99, 102, 241, 0.5);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 80px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--bg-surface);
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.22s, box-shadow 0.22s, transform 0.22s;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-sm);
  position: relative;
}

.history-item:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary-soft);
  box-shadow: var(--shadow-glow);
}

.history-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.history-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.history-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta {
  display: flex;
  gap: 8px;
}

.history-model-tag {
  font-size: 11px;
  line-height: 1.4;
  padding: 1px 8px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.14);
  color: var(--color-primary-strong);
  border: 1px solid rgba(99, 102, 241, 0.25);
  font-weight: 500;
}

.history-arrow {
  color: var(--text-tertiary);
  opacity: 0;
  transform: translateX(-6px);
  transition: all 0.25s;
  flex-shrink: 0;
}

.history-item:hover .history-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--color-primary);
}

.delete-btn {
  color: var(--text-tertiary);
  flex-shrink: 0;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.2s;
}

.delete-btn:hover {
  color: var(--color-danger);
  background: rgba(239, 68, 68, 0.1);
}

/* 移动端 */
@media (max-width: 768px) {
  .history-container {
    padding: 18px;
  }

  .history-item {
    padding: 14px;
  }
}
</style>
