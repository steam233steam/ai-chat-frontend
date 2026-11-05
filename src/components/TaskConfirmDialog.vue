<template>
  <Teleport to="body">
    <Transition name="mb-dialog">
      <div
        v-if="visible"
        class="mb-dialog-mask"
        role="presentation"
        @mousedown.self="onMaskClick"
      >
        <section
          class="mb-dialog-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mb-dialog-title"
        >
          <header class="mb-dialog-header" :class="data ? `is-${mode}` : 'is-neutral'">
            <div class="mb-dialog-icon">
              <el-icon><Bell /></el-icon>
            </div>
            <div class="mb-dialog-heading">
              <span class="mb-dialog-eyebrow">MindButler · 待确认</span>
              <h2 id="mb-dialog-title" class="mb-dialog-title">{{ title }}</h2>
              <p class="mb-dialog-subtitle">{{ subtitle }}</p>
            </div>
            <button
              type="button"
              class="mb-dialog-close"
              aria-label="稍后处理"
              :disabled="acting"
              @click="requestDismiss"
            >
              <el-icon><Close /></el-icon>
            </button>
          </header>

          <div class="mb-dialog-body">
            <div v-if="loading" class="mb-dialog-loading" aria-live="polite">
              <span class="mb-skeleton-line is-wide"></span>
              <span class="mb-skeleton-line"></span>
              <span class="mb-skeleton-card"></span>
            </div>

            <template v-else-if="data">
              <p v-if="data.preview && isPending" class="mb-dialog-preview">{{ data.preview }}</p>

              <section v-if="tasks.length" class="mb-dialog-section">
                <div class="mb-section-heading">
                  <span class="mb-section-title"><el-icon><Calendar /></el-icon>任务</span>
                  <span class="mb-section-count">{{ tasks.length }} 项</span>
                </div>
                <article v-for="(task, index) in tasks" :key="`task-${index}`" class="mb-task-item">
                  <div class="mb-task-leading">
                    <el-icon><Clock /></el-icon>
                  </div>
                  <div class="mb-task-main">
                    <div class="mb-task-title">{{ task.title || '未命名任务' }}</div>
                    <div class="mb-task-meta">
                      <span v-if="task.dueAt" class="mb-meta-chip">{{ formatDueAt(task.dueAt) }}</span>
                      <span v-else class="mb-meta-chip is-muted">无截止时间</span>
                      <span class="mb-meta-chip is-recurrence">{{ formatRecurrence(task.recurrence, task.recurrenceRule) }}</span>
                      <span v-if="task.timezone" class="mb-meta-chip is-timezone">{{ task.timezone }}</span>
                    </div>
                  </div>
                  <span class="mb-task-badge">{{ actionLabel(task.action) }}</span>
                </article>
              </section>

              <section v-if="memories.length" class="mb-dialog-section">
                <div class="mb-section-heading">
                  <span class="mb-section-title"><el-icon><User /></el-icon>记忆</span>
                  <span class="mb-section-count">{{ memories.length }} 条</span>
                </div>
                <article v-for="(memory, index) in memories" :key="`memory-${index}`" class="mb-memory-item">
                  <span class="mb-memory-key">{{ memoryKeyLabel(memory.key || memory.memKey) }}</span>
                  <span class="mb-memory-value">{{ memory.value || memory.content || '' }}</span>
                  <!-- v7.4: scope 字段（global/session），兼容旧版 sessionId -->
                  <span v-if="memory.scope === 'session' || memory.sessionId" class="mb-task-badge is-scope">会话</span>
                  <span v-else class="mb-task-badge is-scope">全局</span>
                  <span v-if="memory.memType" class="mb-task-badge is-memory">{{ memory.memType === 'stable' ? '长期' : '动态' }}</span>
                </article>
              </section>

              <div v-if="isExpired" class="mb-dialog-note is-danger" role="alert">
                <el-icon><WarningFilled /></el-icon>
                <span>{{ expiredText }}</span>
              </div>
              <div v-else-if="remainingText && isPending" class="mb-dialog-note">
                <el-icon><Timer /></el-icon>
                <span>请在 <strong>{{ remainingText }}</strong> 内确认，过期后需要回到聊天重新发起。</span>
              </div>

              <div v-if="error" class="mb-dialog-note is-danger" role="alert">
                <el-icon><WarningFilled /></el-icon>
                <span>{{ error }}</span>
              </div>

              <div v-if="successText" class="mb-dialog-success" role="status">
                <el-icon><CircleCheckFilled /></el-icon>
                <span>{{ successText }}</span>
              </div>
            </template>

            <div v-else class="mb-dialog-empty">
              <el-icon><InfoFilled /></el-icon>
              <p>这条确认已失效，请回到聊天重新发送任务。</p>
            </div>
          </div>

          <footer class="mb-dialog-footer">
            <button
              v-if="isPending"
              type="button"
              class="mb-btn mb-btn-ghost"
              :disabled="acting"
              @click="requestDismiss"
            >
              稍后处理
            </button>
            <div v-if="isPending" class="mb-dialog-actions">
              <button
                type="button"
                class="mb-btn mb-btn-secondary"
                :disabled="acting || loading || !pendingId"
                @click="onReject"
              >
                <el-icon v-if="acting && actingAction === 'reject'" class="mb-spin"><Loading /></el-icon>
                <el-icon v-else><Close /></el-icon>
                取消
              </button>
              <button
                ref="primaryButton"
                type="button"
                class="mb-btn mb-btn-primary"
                :disabled="acting || !pendingId || loading"
                @click="onConfirm"
              >
                <el-icon v-if="acting && actingAction === 'confirm'" class="mb-spin"><Loading /></el-icon>
                <el-icon v-else><Check /></el-icon>
                {{ primaryText }}
              </button>
            </div>
            <button
              v-else
              type="button"
              class="mb-btn mb-btn-primary mb-btn-done"
              @click="requestDismiss"
            >
              完成
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Bell,
  Calendar,
  Check,
  CircleCheckFilled,
  Clock,
  Close,
  InfoFilled,
  Loading,
  Timer,
  User,
  WarningFilled
} from '@element-plus/icons-vue'
import { confirmPendingAction, rejectPendingAction } from '@/api/user'
import {
  confirmResultText,
  formatCountdown,
  formatDueAt,
  formatRecurrence,
  pendingCounts,
  pendingDescription,
  pendingDialogTitle,
  pendingPrimaryText,
  pendingRemainingSeconds
} from '@/utils/pending'

const props = defineProps({
  visible: { type: Boolean, default: false },
  data: { type: Object, default: null },
  pendingId: { type: Number, default: null },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'resolved', 'dismiss'])

const acting = ref(false)
const actingAction = ref('')
const error = ref('')
const successText = ref('')
const localStatus = ref('pending')
const nowMs = ref(Date.now())
const primaryButton = ref(null)
let countdownTimer = null
let closeTimer = null
let previousBodyOverflow = ''

const tasks = computed(() => (Array.isArray(props.data?.tasks) ? props.data.tasks : []))
const memories = computed(() => (Array.isArray(props.data?.memories) ? props.data.memories : []))
const counts = computed(() => pendingCounts(props.data))
const mode = computed(() => {
  if (counts.value.tasks > 0 && counts.value.memories > 0) return 'mixed'
  if (counts.value.memories > 0) return 'memory'
  return 'task'
})
const primaryText = computed(() => pendingPrimaryText(props.data))
const title = computed(() => {
  if (props.loading && !props.data) return '正在读取确认信息'
  if (localStatus.value === 'confirmed') return '已确认'
  if (localStatus.value === 'rejected') return '已取消'
  if (isExpired.value) return '确认已过期'
  return pendingDialogTitle(props.data)
})
const subtitle = computed(() => {
  if (props.loading && !props.data) return '马上就好，请稍候…'
  if (localStatus.value === 'confirmed') return '内容已经写入你的个人数据。'
  if (localStatus.value === 'rejected') return '本次提案不会保存，你可以继续聊天。'
  if (isExpired.value) return '提案已失效，请回到聊天重新发送任务。'
  return pendingDescription(props.data)
})
const remainingSeconds = computed(() =>
  props.data?.expiresAt ? pendingRemainingSeconds(props.data.expiresAt, nowMs.value) : null
)
const remainingText = computed(() => formatCountdown(remainingSeconds.value))
const isExpired = computed(
  () =>
    localStatus.value === 'expired' ||
    (localStatus.value === 'pending' && remainingSeconds.value === 0)
)
const isPending = computed(() => localStatus.value === 'pending' && !isExpired.value)
const expiredText = computed(() =>
  localStatus.value === 'rejected'
    ? '本次提案已取消，不会保存。'
    : '这条确认已过期或已处理，请回到聊天重新发送任务。'
)

const actionLabel = (action) => {
  if (action === 'create') return '新建'
  if (action === 'update') return '更新'
  if (action === 'delete') return '删除'
  return action || '操作'
}

const memoryKeyLabel = (key) => {
  const map = {
    style: '风格',
    goal: '目标',
    schedule: '作息',
    relation: '称呼/关系'
  }
  return map[key] || key || '记忆'
}

const stopCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

const startCountdown = () => {
  stopCountdown()
  if (!props.data?.expiresAt) return
  nowMs.value = Date.now()
  countdownTimer = setInterval(() => {
    nowMs.value = Date.now()
  }, 1000)
}

const clearCloseTimer = () => {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

const restoreBodyScroll = () => {
  document.body.style.overflow = previousBodyOverflow
}

const resetDialog = () => {
  clearCloseTimer()
  acting.value = false
  actingAction.value = ''
  error.value = ''
  successText.value = ''
  localStatus.value = props.data?.status || 'pending'
  nowMs.value = Date.now()
  startCountdown()
}

const closeAfter = (delay) => {
  clearCloseTimer()
  closeTimer = setTimeout(() => {
    emit('update:visible', false)
  }, delay)
}

const focusPrimary = async () => {
  await nextTick()
  primaryButton.value?.focus?.()
}

const requestDismiss = () => {
  if (acting.value) return
  emit('dismiss')
  emit('update:visible', false)
}

const onMaskClick = () => {
  if (acting.value) return
  requestDismiss()
}

const onConfirm = async () => {
  if (acting.value || !isPending.value || !props.pendingId) return
  acting.value = true
  actingAction.value = 'confirm'
  error.value = ''
  try {
    const res = await confirmPendingAction(props.pendingId)
    localStatus.value = 'confirmed'
    successText.value = confirmResultText(res.data)
    emit('resolved', {
      action: 'confirmed',
      pendingId: props.pendingId,
      result: res.data
    })
    closeAfter(1200)
  } catch (e) {
    const code = e?.code
    if (code === 404 || code === 409) {
      localStatus.value = 'expired'
      error.value = '这条确认已过期或已处理，请回到聊天重新发送任务。'
      emit('resolved', {
        action: 'expired',
        pendingId: props.pendingId,
        error: error.value
      })
    } else {
      error.value = e?.message || '确认失败，请稍后重试'
    }
  } finally {
    acting.value = false
    actingAction.value = ''
  }
}

const onReject = async () => {
  if (acting.value || !isPending.value || !props.pendingId) return
  acting.value = true
  actingAction.value = 'reject'
  error.value = ''
  try {
    await rejectPendingAction(props.pendingId)
    localStatus.value = 'rejected'
    successText.value = '已取消本次操作，不会保存任何内容。'
    emit('resolved', {
      action: 'rejected',
      pendingId: props.pendingId
    })
    closeAfter(900)
  } catch (e) {
    const code = e?.code
    if (code === 404 || code === 409) {
      localStatus.value = 'expired'
      error.value = '这条确认已被处理，请刷新后查看最新状态。'
      emit('resolved', {
        action: 'expired',
        pendingId: props.pendingId,
        error: error.value
      })
    } else {
      error.value = e?.message || '取消失败，请稍后重试'
    }
  } finally {
    acting.value = false
    actingAction.value = ''
  }
}

const onKeydown = (event) => {
  if (!props.visible) return
  if (event.key === 'Escape') {
    event.preventDefault()
    requestDismiss()
    return
  }
  if (event.key !== 'Enter') return
  const tag = document.activeElement?.tagName
  if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'BUTTON') return
  if (isPending.value && !acting.value) {
    event.preventDefault()
    onConfirm()
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      resetDialog()
      focusPrimary()
    } else {
      stopCountdown()
      clearCloseTimer()
      restoreBodyScroll()
    }
  },
  { immediate: true }
)

watch(
  () => props.data,
  (data) => {
    if (!props.visible) return
    localStatus.value = data?.status || 'pending'
    nowMs.value = Date.now()
    startCountdown()
  }
)

watch(
  () => props.data?.expiresAt,
  () => {
    if (props.visible) startCountdown()
  }
)

watch(remainingSeconds, (seconds) => {
  if (seconds === 0 && localStatus.value === 'pending') {
    localStatus.value = 'expired'
    emit('resolved', {
      action: 'expired',
      pendingId: props.pendingId,
      error: '这条确认已过期，请回到聊天重新发送任务。'
    })
  }
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  stopCountdown()
  clearCloseTimer()
  restoreBodyScroll()
})
</script>

<style scoped>
.mb-dialog-mask {
  position: fixed;
  inset: 0;
  /* 低于 Element Plus Message 的 2000，确认成功后 toast 能显示在弹窗之上 */
  z-index: 1999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(9, 11, 20, 0.56);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.mb-dialog-panel {
  width: min(620px, 100%);
  max-height: min(88vh, 780px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: 24px;
  background: var(--bg-surface);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  animation: mbDialogIn 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.mb-dialog-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 24px 24px 20px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.13), rgba(139, 92, 246, 0.07) 55%, transparent);
  border-bottom: 1px solid var(--border-subtle);
}

.mb-dialog-header::after {
  content: '';
  position: absolute;
  top: -90px;
  right: -40px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.22), transparent 68%);
  pointer-events: none;
}

.mb-dialog-header.is-memory {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.13), rgba(16, 185, 129, 0.06) 55%, transparent);
}

.mb-dialog-header.is-mixed {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.06) 55%, transparent);
}

.mb-dialog-icon {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  background: linear-gradient(135deg, var(--color-primary), #8b5cf6);
  color: #fff;
  font-size: 22px;
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.35);
}

.is-memory .mb-dialog-icon {
  background: linear-gradient(135deg, #22c55e, #10b981);
  box-shadow: 0 10px 24px rgba(34, 197, 94, 0.3);
}

.is-mixed .mb-dialog-icon {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  box-shadow: 0 10px 24px rgba(139, 92, 246, 0.32);
}

.is-neutral .mb-dialog-header {
  background: var(--bg-surface-soft);
}

.is-neutral .mb-dialog-icon {
  background: var(--bg-surface-soft);
  color: var(--text-tertiary);
  box-shadow: none;
}

.mb-dialog-heading {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.mb-dialog-eyebrow {
  display: block;
  margin-bottom: 5px;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.mb-dialog-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.mb-dialog-subtitle {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.mb-dialog-close {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: var(--bg-surface-soft);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mb-dialog-close:hover:not(:disabled) {
  color: var(--text-primary);
  border-color: var(--border-strong);
  background: var(--bg-surface);
}

.mb-dialog-close:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.mb-dialog-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
}

.mb-dialog-preview {
  margin: 0 0 16px;
  padding: 12px 14px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.16);
  border-radius: 12px;
  background: rgba(var(--color-primary-rgb), 0.06);
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
}

.mb-dialog-section + .mb-dialog-section {
  margin-top: 18px;
}

.mb-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 9px;
}

.mb-section-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.mb-section-count {
  color: var(--text-tertiary);
  font-size: 11px;
}

.mb-task-item,
.mb-memory-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  background: var(--bg-surface-soft);
}

.mb-task-item + .mb-task-item,
.mb-memory-item + .mb-memory-item {
  margin-top: 8px;
}

.mb-task-leading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
  font-size: 17px;
}

.mb-task-main {
  flex: 1;
  min-width: 0;
}

.mb-task-title {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mb-task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.mb-meta-chip {
  display: inline-flex;
  align-items: center;
  min-height: 21px;
  padding: 1px 8px;
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
}

.mb-meta-chip.is-muted {
  color: var(--text-tertiary);
}

.mb-meta-chip.is-recurrence {
  border-color: rgba(245, 158, 11, 0.22);
  background: rgba(245, 158, 11, 0.08);
  color: var(--color-warning);
}

.mb-meta-chip.is-timezone {
  color: var(--text-tertiary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10px;
}

.mb-task-badge {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.mb-task-badge.is-memory {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.mb-task-badge.is-scope {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
  font-size: 10px;
}

.mb-memory-key {
  flex: 0 0 auto;
  min-width: 52px;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
}

.mb-memory-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mb-dialog-note {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 16px;
  padding: 10px 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 11px;
  background: var(--bg-surface-soft);
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.55;
}

.mb-dialog-note strong {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.mb-dialog-note .el-icon {
  margin-top: 1px;
  flex: 0 0 auto;
}

.mb-dialog-note.is-danger {
  border-color: rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.07);
  color: var(--color-danger);
}

.mb-dialog-success {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.08);
  color: var(--color-success);
  font-size: 13px;
  font-weight: 600;
}

.mb-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface);
}

.mb-dialog-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-left: auto;
}

.mb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 16px;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.mb-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none !important;
}

.mb-btn-ghost {
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-tertiary);
}

.mb-btn-ghost:hover:not(:disabled) {
  background: var(--bg-surface-soft);
  color: var(--text-secondary);
}

.mb-btn-secondary {
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface-soft);
  color: var(--text-secondary);
}

.mb-btn-secondary:hover:not(:disabled) {
  border-color: var(--border-strong);
  background: var(--bg-surface);
  color: var(--text-primary);
}

.mb-btn-primary {
  border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  color: #fff;
  box-shadow: 0 7px 18px rgba(99, 102, 241, 0.3);
}

.mb-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.42);
}

.mb-btn-done {
  margin-left: auto;
}

.mb-dialog-loading {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mb-skeleton-line,
.mb-skeleton-card {
  display: block;
  border-radius: 9px;
  background: linear-gradient(90deg, var(--bg-surface-soft), var(--border-subtle), var(--bg-surface-soft));
  background-size: 200% 100%;
  animation: mbShimmer 1.2s ease-in-out infinite;
}

.mb-skeleton-line {
  width: 64%;
  height: 14px;
}

.mb-skeleton-line.is-wide {
  width: 86%;
}

.mb-skeleton-card {
  height: 70px;
  margin-top: 8px;
  border-radius: 14px;
}

.mb-dialog-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 30px 10px;
  color: var(--text-tertiary);
  text-align: center;
  font-size: 13px;
}

.mb-dialog-empty .el-icon {
  font-size: 28px;
  color: var(--color-warning);
}

.mb-dialog-empty p {
  margin: 0;
}

.mb-spin {
  animation: mbSpin 0.8s linear infinite;
}

.mb-dialog-enter-active,
.mb-dialog-leave-active {
  transition: opacity 0.22s ease;
}

.mb-dialog-enter-active .mb-dialog-panel,
.mb-dialog-leave-active .mb-dialog-panel {
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;
}

.mb-dialog-enter-from,
.mb-dialog-leave-to {
  opacity: 0;
}

.mb-dialog-enter-from .mb-dialog-panel,
.mb-dialog-leave-to .mb-dialog-panel {
  opacity: 0;
  transform: translateY(14px) scale(0.97);
}

@keyframes mbDialogIn {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes mbShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes mbSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  /* 移动端性能降级：去掉遮罩模糊，纯色背景已足够，降低 GPU 负担 */
  .mb-dialog-mask {
    align-items: flex-end;
    padding: 0;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .mb-dialog-panel {
    width: 100%;
    max-height: 84vh;
    border-radius: 22px 22px 0 0;
    animation-name: mbDialogSheetIn;
  }

  .mb-dialog-header {
    padding: 20px 18px 16px;
  }

  /* 给底部加一条把手，暗示可下拉 / 有内容可滚动，避免误以为贴死 */
  .mb-dialog-header::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.35);
    z-index: 2;
  }

  .mb-dialog-body {
    padding: 16px 18px;
  }

  .mb-dialog-footer {
    padding: 14px 18px calc(16px + env(safe-area-inset-bottom));
  }

  .mb-task-meta {
    gap: 5px;
  }

  @keyframes mbDialogSheetIn {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
