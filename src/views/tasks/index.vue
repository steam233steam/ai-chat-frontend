<template>
  <div class="tasks-container">
    <div class="tasks-header">
      <div class="tasks-heading">
        <el-button class="back-btn" @click="router.push('/chat')">
          <el-icon><ArrowLeft /></el-icon>
          返回对话
        </el-button>
        <div class="title-block">
          <div class="title-row">
            <h2>任务闹钟</h2>
            <span class="tasks-count">{{ currentTasks.length }}</span>
          </div>
          <p class="subtitle">到点自动执行：站内提醒，或回调一个 webhook 地址</p>
        </div>
      </div>
      <el-button class="refresh-btn" :loading="loading" @click="loadTasks">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <div class="tasks-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tasks-tab', { active: status === tab.value }]"
        type="button"
        role="tab"
        :aria-selected="status === tab.value"
        @click="switchStatus(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <el-empty v-if="!loading && currentTasks.length === 0" :description="emptyText" />

    <div v-else v-loading="loading" class="tasks-list">
      <article v-for="task in currentTasks" :key="task.id" class="task-card">
        <div class="task-row">
          <div class="task-main">
            <div class="task-title-line">
              <span :class="['task-dot', task.status, { overdue: task.overdue }]"></span>
              <span class="task-title">{{ task.title }}</span>
            </div>
            <div class="task-meta">
              <span class="task-time">{{ formatTime(task.dueAt) }}</span>
              <span class="task-chip">{{ recurrenceLabel(task.recurrence) }}</span>
              <span class="task-chip action">{{ actionLabel(task) }}</span>
              <span v-if="task.overdue" class="task-chip danger">已到期</span>
              <span v-if="task.status !== 'pending'" class="task-chip muted">{{ statusLabel(task.status) }}</span>
            </div>
          </div>
          <div class="task-actions">
            <el-button
              v-if="task.status === 'pending'"
              text
              size="small"
              :loading="actingId === task.id"
              @click="handleComplete(task)"
            >
              完成
            </el-button>
            <el-button text size="small" @click="toggleRuns(task)">
              {{ expandedId === task.id ? '收起记录' : '执行记录' }}
            </el-button>
            <el-button v-if="task.status === 'pending'" text size="small" @click="openEdit(task)">
              设置
            </el-button>
            <el-button text size="small" class="danger-text" @click="handleDelete(task)">删除</el-button>
          </div>
        </div>

        <div v-if="expandedId === task.id" class="task-runs">
          <div v-if="runsLoading" class="runs-loading">
            <el-icon class="is-spinning"><Loading /></el-icon>
            <span>加载执行记录…</span>
          </div>
          <div v-else-if="runs.length === 0" class="runs-empty">
            还没响过。到期后每分钟扫一次，响过会记在这里。
          </div>
          <ul v-else class="runs-list">
            <li v-for="run in runs" :key="run.id" class="run-item">
              <span :class="['run-status', run.status]">{{ run.status === 'success' ? '成功' : '失败' }}</span>
              <span class="run-time">{{ formatTime(run.startedAt) }}</span>
              <span class="run-action">{{ run.actionType }}</span>
              <span class="run-detail">{{ run.detail }}</span>
            </li>
          </ul>
        </div>
      </article>
    </div>

    <el-dialog v-model="editVisible" title="任务设置" width="420px" align-center>
      <div class="edit-field">
        <label>任务名称</label>
        <el-input v-model="editForm.title" maxlength="128" show-word-limit />
      </div>
      <div class="edit-field">
        <label>到点做什么</label>
        <el-select v-model="editForm.actionType" style="width: 100%">
          <el-option label="站内提醒（默认）" value="notify" />
          <el-option label="调用 Webhook" value="webhook" />
        </el-select>
      </div>
      <div v-if="editForm.actionType === 'webhook'" class="edit-field">
        <label>Webhook 地址</label>
        <el-input v-model="editForm.webhookUrl" placeholder="https://example.com/hook" />
        <p class="field-hint">到点会 POST 一条 JSON 到这个地址，5 秒超时，2xx 算成功。</p>
      </div>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Loading, Refresh } from '@element-plus/icons-vue'
import { listTasks, listTaskRuns, updateTask, completeTask, deleteTask } from '@/api/task'

const router = useRouter()

const tabs = [
  { label: '待办', value: 'pending' },
  { label: '已完成', value: 'done' },
  { label: '已取消', value: 'cancelled' }
]

const status = ref('pending')
const tasks = ref([])
const loading = ref(false)
const actingId = ref(null)
const expandedId = ref(null)
const runs = ref([])
const runsLoading = ref(false)

const editVisible = ref(false)
const saving = ref(false)
const editForm = ref({ id: null, version: 0, title: '', actionType: 'notify', webhookUrl: '' })

const currentTasks = computed(() => tasks.value)
const emptyText = computed(() => {
  if (status.value === 'pending') return '还没有待办任务。在聊天里说「明天九点提醒我交作业」就能建一条。'
  if (status.value === 'done') return '还没有完成的任务。'
  return '没有已取消的任务。'
})

const formatTime = (value) => {
  if (!value) return '不限时间'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const pad = (n) => String(n).padStart(2, '0')
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return sameDay ? `今天 ${hm}` : `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
}

const recurrenceLabel = (recurrence) => {
  if (recurrence === 'daily') return '每天'
  if (recurrence === 'weekly') return '每周'
  return '一次'
}

const statusLabel = (value) => (value === 'done' ? '已完成' : value === 'cancelled' ? '已取消' : value)

const actionLabel = (task) => {
  if (task.actionType === 'webhook') {
    const match = /"url"\s*:\s*"([^"]+)"/.exec(task.actionConfig || '')
    return match ? `Webhook · ${match[1].replace(/^https?:\/\//, '').slice(0, 28)}` : 'Webhook'
  }
  return '站内提醒'
}

const loadTasks = async () => {
  loading.value = true
  try {
    const res = await listTasks(status.value, 50)
    tasks.value = res.data || []
  } catch (e) {
    ElMessage.error('任务加载失败')
  } finally {
    loading.value = false
  }
}

const switchStatus = (value) => {
  status.value = value
  expandedId.value = null
  loadTasks()
}

const toggleRuns = async (task) => {
  if (expandedId.value === task.id) {
    expandedId.value = null
    return
  }
  expandedId.value = task.id
  runs.value = []
  runsLoading.value = true
  try {
    const res = await listTaskRuns(task.id, 20)
    runs.value = res.data || []
  } catch (e) {
    ElMessage.error('执行记录加载失败')
  } finally {
    runsLoading.value = false
  }
}

const handleComplete = async (task) => {
  actingId.value = task.id
  try {
    await completeTask(task.id, task.version)
    ElMessage.success(task.recurrence === 'once' ? '已完成' : '已完成，已滚到下一次')
    await loadTasks()
  } catch (e) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    actingId.value = null
  }
}

const handleDelete = async (task) => {
  try {
    await ElMessageBox.confirm(`删除「${task.title}」？`, '删除任务', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (e) {
    return
  }
  try {
    await deleteTask(task.id)
    ElMessage.success('已删除')
    await loadTasks()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

const openEdit = (task) => {
  const match = /"url"\s*:\s*"([^"]+)"/.exec(task.actionConfig || '')
  editForm.value = {
    id: task.id,
    version: task.version,
    title: task.title,
    actionType: task.actionType === 'webhook' ? 'webhook' : 'notify',
    webhookUrl: match ? match[1] : ''
  }
  editVisible.value = true
}

const handleSave = async () => {
  const form = editForm.value
  if (form.actionType === 'webhook' && !/^https?:\/\//.test(form.webhookUrl)) {
    ElMessage.warning('Webhook 地址要以 http:// 或 https:// 开头')
    return
  }
  saving.value = true
  try {
    await updateTask(form.id, {
      version: form.version,
      title: form.title,
      actionType: form.actionType,
      actionConfig: form.actionType === 'webhook' ? JSON.stringify({ url: form.webhookUrl }) : null
    })
    ElMessage.success('已保存')
    editVisible.value = false
    await loadTasks()
  } catch (e) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadTasks)
</script>

<style scoped>
.tasks-container {
  height: 100vh;
  overflow-y: auto;
  padding: 24px clamp(16px, 4vw, 48px) 48px;
  background: var(--bg-base);
}

.tasks-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.tasks-heading {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.title-row h2 {
  margin: 0;
  font-size: 22px;
  color: var(--text-primary);
}

.tasks-count {
  color: var(--text-tertiary);
  font-size: 13px;
}

.subtitle {
  margin: 4px 0 0;
  color: var(--text-tertiary);
  font-size: 13px;
}

.tasks-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tasks-tab {
  border: none;
  background: var(--bg-surface-soft);
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tasks-tab.active {
  background: var(--color-primary);
  color: #fff;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 14px 16px;
}

.task-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.task-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex: none;
}

.task-dot.overdue {
  background: #ef4444;
}

.task-dot.done {
  background: #22c55e;
}

.task-dot.cancelled {
  background: var(--text-tertiary);
}

.task-title {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.task-chip {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--bg-surface-soft);
}

.task-chip.action {
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.1);
}

.task-chip.danger {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.task-actions {
  display: flex;
  gap: 4px;
  flex: none;
}

.danger-text {
  color: #ef4444;
}

.task-runs {
  margin-top: 12px;
  border-top: 1px dashed var(--border-subtle);
  padding-top: 10px;
  font-size: 12px;
}

.runs-empty,
.runs-loading {
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.runs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.run-item {
  display: flex;
  gap: 10px;
  align-items: baseline;
  color: var(--text-secondary);
}

.run-status {
  flex: none;
  padding: 0 6px;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
}

.run-status.failed {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.run-time {
  color: var(--text-tertiary);
  flex: none;
}

.run-detail {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-field {
  margin-bottom: 14px;
}

.edit-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
