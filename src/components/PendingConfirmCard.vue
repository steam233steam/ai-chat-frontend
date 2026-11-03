<template>
  <div class="pending-card" v-if="data">
    <div class="pending-card-header">
      <el-icon class="pending-card-icon"><Bell /></el-icon>
      <span class="pending-card-title">确认请求</span>
      <el-tag v-if="data.actionType" :type="tagType" size="small" effect="light">{{ typeLabel }}</el-tag>
      <el-tag :type="statusTagType" size="small">{{ statusLabel }}</el-tag>
    </div>

    <div class="pending-card-body">
      <p class="pending-preview">{{ data.preview || '确认以下操作？' }}</p>

      <!-- 记忆列表 -->
      <div v-if="data.memories?.length" class="pending-section">
        <span class="pending-section-label"><el-icon><User /></el-icon>记忆</span>
        <div v-for="(mem, i) in data.memories" :key="i" class="pending-item">
          <span class="pending-item-key">{{ mem.memKey || mem.key }}</span>
          <span class="pending-item-value">{{ mem.value || mem.content }}</span>
          <el-tag v-if="mem.memType" size="small" type="info" effect="plain">{{ mem.memType }}</el-tag>
        </div>
      </div>

      <!-- 任务列表 -->
      <div v-if="data.tasks?.length" class="pending-section">
        <span class="pending-section-label"><el-icon><List /></el-icon>任务</span>
        <div v-for="(task, i) in data.tasks" :key="i" class="pending-item">
          <el-tag size="small" :type="task.action === 'delete' ? 'danger' : 'success'" effect="light">{{ actionLabel(task.action) }}</el-tag>
          <span class="pending-item-value">{{ task.title }}</span>
          <span v-if="task.dueAt" class="pending-item-meta">{{ formatDueAt(task.dueAt) }}</span>
          <el-tag v-if="task.recurrence && task.recurrence !== 'once'" size="small" type="warning" effect="plain">{{ recurrenceLabel(task.recurrence) }}</el-tag>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="data.status === 'pending'" class="pending-actions">
      <el-button type="danger" plain size="small" :loading="acting" @click="onReject">
        <el-icon><Close /></el-icon>取消
      </el-button>
      <el-button type="primary" size="small" :loading="acting" @click="onConfirm">
        <el-icon><Check /></el-icon>确认
      </el-button>
    </div>

    <!-- 已处理状态 -->
    <div v-else class="pending-done">
      <el-icon :color="data.status === 'confirmed' ? 'var(--color-success)' : 'var(--text-tertiary)'">
        <Check v-if="data.status === 'confirmed'" /><Close v-else />
      </el-icon>
      <span>{{ data.status === 'confirmed' ? '已确认' : '已取消' }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Bell, Check, Close, List, User } from '@element-plus/icons-vue'
import { confirmPendingAction, rejectPendingAction } from '@/api/user'

const props = defineProps({
  data: { type: Object, default: null },
  pendingId: { type: Number, default: null }
})

const emit = defineEmits(['confirmed', 'rejected'])

const acting = ref(false)

const tagType = computed(() => {
  const t = props.data?.actionType
  if (t === 'memory') return 'success'
  if (t === 'task') return 'warning'
  if (t === 'mixed') return 'primary'
  return 'info'
})

const typeLabel = computed(() => {
  const t = props.data?.actionType
  if (t === 'memory') return '记忆'
  if (t === 'task') return '任务'
  if (t === 'mixed') return '混合'
  return t || ''
})

const statusTagType = computed(() => {
  const s = props.data?.status
  if (s === 'confirmed') return 'success'
  if (s === 'rejected' || s === 'expired') return 'info'
  return 'warning'
})

const statusLabel = computed(() => {
  const s = props.data?.status
  if (s === 'pending') return '待确认'
  if (s === 'confirmed') return '已确认'
  if (s === 'rejected') return '已取消'
  if (s === 'expired') return '已过期'
  return s
})

const actionLabel = (action) => {
  if (action === 'create') return '新建'
  if (action === 'update') return '更新'
  if (action === 'delete') return '删除'
  return action || '操作'
}

const recurrenceLabel = (r) => {
  const map = { daily: '每日', weekly: '每周', monthly: '每月', once: '单次' }
  return map[r] || r
}

const formatDueAt = (dueAt) => {
  if (!dueAt) return ''
  const d = new Date(dueAt)
  if (Number.isNaN(d.getTime())) return dueAt
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const onConfirm = async () => {
  if (acting.value || !props.pendingId) return
  acting.value = true
  try {
    const res = await confirmPendingAction(props.pendingId)
    if (res.code === 200) {
      ElMessage.success(res.data?.alreadyConfirmed ? '该请求已确认过' : '确认成功')
      if (props.data) props.data.status = 'confirmed'
      emit('confirmed', props.pendingId)
    } else {
      ElMessage.warning(res.message || '确认失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '确认失败')
  } finally {
    acting.value = false
  }
}

const onReject = async () => {
  if (acting.value || !props.pendingId) return
  acting.value = true
  try {
    const res = await rejectPendingAction(props.pendingId)
    if (res.code === 200) {
      ElMessage.info('已取消')
      if (props.data) props.data.status = 'rejected'
      emit('rejected', props.pendingId)
    } else {
      ElMessage.warning(res.message || '取消失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '取消失败')
  } finally {
    acting.value = false
  }
}
</script>

<style scoped>
.pending-card {
  margin-top: 10px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.06) 100%);
  overflow: hidden;
  max-width: 100%;
}

.pending-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.12);
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
}

.pending-card-icon {
  color: var(--color-primary);
  font-size: 16px;
}

.pending-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.pending-card-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pending-preview {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.pending-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pending-section-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 7px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  font-size: 13px;
}

.pending-item-key {
  font-weight: 600;
  color: var(--color-primary);
  font-size: 12px;
  min-width: 40px;
}

.pending-item-value {
  flex: 1;
  color: var(--text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-item-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.pending-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--border-subtle);
}

.pending-done {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-tertiary);
  border-top: 1px solid var(--border-subtle);
}
</style>
