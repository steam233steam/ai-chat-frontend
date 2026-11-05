<template>
  <section class="sidebar-tasks">
    <div class="task-toolbar">
      <div class="task-filters" role="tablist" aria-label="任务状态">
        <button
          v-for="option in filters"
          :key="option.value"
          :class="['task-filter', { active: status === option.value }]"
          type="button"
          role="tab"
          :aria-selected="status === option.value"
          @click="setStatus(option.value)"
        >
          {{ option.label }}
          <span v-if="counts[option.value]" class="filter-count">{{ counts[option.value] }}</span>
        </button>
      </div>
      <button
        class="task-refresh"
        :class="{ spinning: loading }"
        type="button"
        title="刷新任务"
        @click="$emit('refresh')"
      >
        <el-icon><Refresh /></el-icon>
      </button>
    </div>

    <div class="task-list-wrap">
      <div v-if="loading && sortedTasks.length === 0" class="task-loading">
        <el-icon class="is-spinning"><Loading /></el-icon>
        <span>正在同步任务…</span>
      </div>

      <div v-else-if="sortedTasks.length === 0" class="task-empty">
        <div class="task-empty-icon">
          <el-icon><Calendar /></el-icon>
        </div>
        <strong>{{ emptyText }}</strong>
        <span v-if="status === 'pending'">在聊天里说“明天下午三点提醒我开会”，确认后会出现在这里。</span>
        <span v-else>这里会保留你已经处理过的任务。</span>
      </div>

      <div v-else class="task-list">
        <article
          v-for="task in sortedTasks"
          :key="task.id"
          :class="['task-item', { overdue: task.overdue, acting: actingTaskId === task.id }]"
        >
          <button
            v-if="task.status === 'pending'"
            class="task-check"
            type="button"
            title="标记完成"
            :disabled="actingTaskId === task.id"
            @click="$emit('complete', task)"
          >
            <el-icon><CircleCheck /></el-icon>
          </button>
          <span v-else class="task-state">
            <el-icon>
              <CircleCheck v-if="task.status === 'done'" />
              <CircleClose v-else />
            </el-icon>
          </span>

          <div class="task-main">
            <div class="task-title" :title="task.title">{{ task.title || '未命名任务' }}</div>
            <div class="task-meta">
              <span class="task-due" :class="{ 'is-overdue': task.overdue }">
                <el-icon><Clock /></el-icon>
                {{ taskDueText(task) }}
              </span>
              <span v-if="task.recurrence && task.recurrence !== 'once'" class="task-recurrence">
                {{ taskRecurrenceText(task) }}
              </span>
              <span v-if="task.overdue" class="task-overdue">已逾期</span>
            </div>
            <button
              v-if="sourceTitle(task)"
              class="task-source"
              type="button"
              :title="'回到发起任务的会话：' + sourceTitle(task)"
              @click="$emit('open-session', taskSourceSessionId(task))"
            >
              来自「{{ sourceTitle(task) }}」
            </button>
            <span v-else-if="taskSourceSessionId(task)" class="task-source is-missing">
              来源会话已删除
            </span>
          </div>

          <button
            class="task-delete"
            type="button"
            title="删除任务"
            :disabled="actingTaskId === task.id"
            @click="$emit('delete', task)"
          >
            <el-icon><Delete /></el-icon>
          </button>
        </article>
      </div>
    </div>

    <p class="task-hint">任务全账号共享；页面打开时每 30 秒检查到期任务并弹应用内通知，不会主动发 QQ / 微信。从聊天确认的任务会标注来源会话。</p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import {
  Calendar,
  CircleCheck,
  CircleClose,
  Clock,
  Delete,
  Loading,
  Refresh
} from '@element-plus/icons-vue'
import {
  sortTasks,
  taskDueText,
  taskRecurrenceText,
  taskSourceSessionId
} from '@/utils/sidebar'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  counts: {
    type: Object,
    default: () => ({ pending: 0, done: 0, cancelled: 0 })
  },
  status: { type: String, default: 'pending' },
  loading: { type: Boolean, default: false },
  actingTaskId: { type: [Number, String], default: null },
  sessions: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:status', 'refresh', 'complete', 'delete', 'open-session'])

const filters = [
  { value: 'pending', label: '待办' },
  { value: 'done', label: '完成' },
  { value: 'cancelled', label: '取消' }
]

const sortedTasks = computed(() => sortTasks(props.tasks))

const sessionTitleById = computed(() => {
  const map = {}
  for (const session of props.sessions) {
    if (!session?.sessionId) continue
    map[session.sessionId] = session.title || '未命名会话'
  }
  return map
})

const emptyText = computed(() => {
  if (props.status === 'done') return '还没有已完成任务'
  if (props.status === 'cancelled') return '没有已取消任务'
  return '暂无待办任务'
})

const sourceTitle = (task) => {
  const sessionId = taskSourceSessionId(task)
  return sessionId ? sessionTitleById.value[sessionId] || '' : ''
}

const setStatus = (status) => {
  if (status !== props.status) emit('update:status', status)
}
</script>

<style scoped>
.sidebar-tasks {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.task-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 12px 8px;
  border-bottom: 1px solid var(--border-sidebar);
}

.task-filters {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.task-filter {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 6px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-sidebar-soft);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.16s ease;
}

.task-filter:hover {
  color: var(--text-sidebar);
  background: rgba(255, 255, 255, 0.07);
}

.task-filter.active {
  color: #fff;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.75), rgba(139, 92, 246, 0.72));
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.25);
}

.filter-count {
  margin-left: 3px;
  font-size: 9px;
  opacity: 0.75;
}

.task-refresh {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-sidebar-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.16s ease;
}

.task-refresh:hover {
  color: #fff;
  border-color: rgba(129, 140, 248, 0.4);
  background: rgba(129, 140, 248, 0.18);
}

.task-refresh.spinning .el-icon {
  animation: task-spin 0.9s linear infinite;
}

.task-list-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 10px 12px;
}

.task-loading,
.task-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 160px;
  padding: 22px 12px;
  text-align: center;
  color: var(--text-sidebar-soft);
  font-size: 11px;
}

.task-loading {
  flex-direction: row;
  min-height: 80px;
}

.is-spinning {
  animation: task-spin 0.9s linear infinite;
}

.task-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  color: rgba(165, 180, 252, 0.9);
  background: rgba(129, 140, 248, 0.14);
}

.task-empty-icon .el-icon {
  font-size: 20px;
}

.task-empty strong {
  color: var(--text-sidebar);
  font-size: 12px;
  font-weight: 600;
}

.task-empty span {
  max-width: 210px;
  line-height: 1.6;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.task-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 9px 8px 9px 7px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.045);
  transition: all 0.16s ease;
}

.task-item:hover {
  border-color: rgba(129, 140, 248, 0.3);
  background: rgba(129, 140, 248, 0.075);
}

.task-item.overdue {
  border-color: rgba(239, 68, 68, 0.32);
  background: rgba(239, 68, 68, 0.07);
}

.task-item.acting {
  opacity: 0.65;
}

.task-check,
.task-state {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  margin-top: 1px;
  padding: 0;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-check {
  background: rgba(34, 197, 94, 0.12);
  color: #86efac;
  cursor: pointer;
  transition: all 0.16s ease;
}

.task-check:hover {
  background: rgba(34, 197, 94, 0.26);
  color: #fff;
  transform: scale(1.06);
}

.task-check:disabled {
  cursor: wait;
}

.task-state {
  color: var(--text-sidebar-soft);
}

.task-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-title {
  color: var(--text-sidebar);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow-wrap: anywhere;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  color: var(--text-sidebar-soft);
  font-size: 10px;
}

.task-due {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.task-due .el-icon {
  font-size: 10px;
}

.task-due.is-overdue {
  color: #fca5a5;
}

.task-recurrence {
  padding: 0 5px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.07);
}

.task-overdue {
  padding: 0 5px;
  border-radius: 20px;
  background: rgba(239, 68, 68, 0.16);
  color: #fca5a5;
  font-size: 9px;
}

.task-source {
  align-self: flex-start;
  max-width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: rgba(165, 180, 252, 0.92);
  font-size: 10px;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-source:hover {
  color: #c7d2fe;
  text-decoration: underline;
}

.task-source.is-missing {
  color: var(--text-sidebar-soft);
  opacity: 0.65;
  cursor: default;
}

.task-delete {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-sidebar-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.16s ease;
}

.task-item:hover .task-delete {
  opacity: 1;
}

.task-delete:hover {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.16);
}

.task-delete .el-icon {
  font-size: 12px;
}

.task-hint {
  margin: 0;
  padding: 9px 14px 12px;
  border-top: 1px solid var(--border-sidebar);
  color: var(--text-sidebar-soft);
  font-size: 9px;
  line-height: 1.5;
  opacity: 0.8;
}

@keyframes task-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .task-delete {
    width: 30px;
    height: 30px;
    opacity: 1;
    background: rgba(255, 255, 255, 0.06);
  }

  .task-source {
    font-size: 11px;
  }
}
</style>
