<template>
  <div class="history-container">
    <div class="history-header">
      <div class="history-heading">
        <el-button text @click="router.push('/chat')">
          <el-icon><ArrowLeft /></el-icon>
          返回对话
        </el-button>
        <h2>对话历史</h2>
      </div>
      <el-button type="primary" @click="goToChat">
        <el-icon><ChatDotRound /></el-icon>
        新对话
      </el-button>
    </div>

    <el-empty v-if="!hasHistory && !loading" description="暂无对话历史" />

    <div v-else v-loading="loading" class="history-list">
      <div
        v-for="chat in chatHistory"
        :key="chat.sessionId"
        class="history-item"
        @click="selectChat(chat.sessionId)"
      >
        <el-icon class="history-icon"><ChatDotRound /></el-icon>
        <div class="history-info">
          <div class="history-title">{{ chat.title || '新会话' }}</div>
        </div>
        <el-button
          text
          size="small"
          class="delete-btn"
          @click.stop="deleteChat(chat.sessionId)"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Delete, ChatDotRound } from '@element-plus/icons-vue'
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
  padding: 24px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.history-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
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
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #ebeef5;
}

.history-item:hover {
  background: #f5f7fa;
  border-color: #c0c4cc;
}

.history-icon {
  font-size: 20px;
  color: #667eea;
  flex-shrink: 0;
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-title {
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  color: #909399;
  flex-shrink: 0;
}

.delete-btn:hover {
  color: #f56c6c;
}
</style>
