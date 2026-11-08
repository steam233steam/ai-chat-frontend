import { formatDueAt, formatRecurrence } from './pending.js'

const MEMORY_KEY_LABELS = {
  style: '回答风格',
  fact: '事实',
  schedule: '作息',
  relation: '关系'
}

const MEMORY_TYPE_LABELS = {
  stable: '长期',
  dynamic: '动态'
}

const TASK_STATUS_LABELS = {
  pending: '待办',
  done: '已完成',
  cancelled: '已取消'
}

/**
 * 记忆按作用域拆分：
 * - global：sessionId 为空，跨会话生效
 * - bySession：key=sessionId，只在该会话生效
 *
 * 后端 MemoryVO 用 sessionId 表示作用域；这里只做展示分组，不改数据。
 */
export function splitMemories(memories = []) {
  const global = []
  const bySession = {}

  for (const memory of memories) {
    if (!memory) continue
    const sessionId = typeof memory.sessionId === 'string' ? memory.sessionId.trim() : ''
    if (!sessionId) {
      global.push(memory)
      continue
    }
    if (!bySession[sessionId]) bySession[sessionId] = []
    bySession[sessionId].push(memory)
  }

  return { global, bySession }
}

/** 每条会话级记忆的条数，用于侧栏会话行的小角标。 */
export function sessionMemoryCounts(memories = []) {
  const counts = {}
  const { bySession } = splitMemories(memories)
  for (const [sessionId, list] of Object.entries(bySession)) {
    counts[sessionId] = list.length
  }
  return counts
}

export function memoryKeyLabel(key) {
  return MEMORY_KEY_LABELS[key] || key || '记忆'
}

export function memoryTypeLabel(type) {
  return MEMORY_TYPE_LABELS[type] || ''
}

export function taskStatusLabel(status) {
  return TASK_STATUS_LABELS[status] || status || ''
}

export function taskDueText(task) {
  return task?.dueAt ? formatDueAt(task.dueAt, { compact: true }) : '无截止时间'
}

export function taskRecurrenceText(task) {
  return formatRecurrence(task?.recurrence, task?.recurrenceRule)
}

export function taskSourceSessionId(task) {
  const sessionId = task?.createdFromSession
  return typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : null
}

/**
 * 任务排序：
 * - pending：逾期优先，再按 dueAt 升序，无 dueAt 的放最后
 * - done / cancelled：按 completedAt / updateTime 倒序
 * 同一排序条件下 id 大的（更新的）在前。
 */
export function sortTasks(tasks = []) {
  return tasks
    .filter(Boolean)
    .slice()
    .sort((a, b) => {
      const aPending = (a.status || 'pending') === 'pending'
      const bPending = (b.status || 'pending') === 'pending'
      if (aPending !== bPending) return aPending ? -1 : 1

      if (aPending) {
        const aOverdue = a.overdue ? 1 : 0
        const bOverdue = b.overdue ? 1 : 0
        if (aOverdue !== bOverdue) return bOverdue - aOverdue

        const aHasDue = Boolean(a.dueAt)
        const bHasDue = Boolean(b.dueAt)
        if (aHasDue !== bHasDue) return aHasDue ? -1 : 1
        if (aHasDue && bHasDue) {
          const byDue = String(a.dueAt).localeCompare(String(b.dueAt))
          if (byDue !== 0) return byDue
        }
      } else {
        const aTime = a.completedAt || a.updateTime || a.createTime || ''
        const bTime = b.completedAt || b.updateTime || b.createTime || ''
        const byTime = String(bTime).localeCompare(String(aTime))
        if (byTime !== 0) return byTime
      }

      return (b.id ?? 0) - (a.id ?? 0)
    })
}
