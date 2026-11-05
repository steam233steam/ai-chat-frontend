import { parseLocalDateTime } from './pending.js'

/** 页面打开时，任务到期后多久内还值得弹提醒（避免一打开页面刷出几天前的逾期任务）。 */
export const DUE_NOTIFY_WINDOW_MS = 10 * 60 * 1000

/** 已提醒记录保留 30 天，按 taskId + dueAt 区分同一任务的每一次 occurrence。 */
export const DUE_NOTIFIED_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/**
 * 同一条任务的不同到期时间要分别提醒；重复任务滚动 dueAt 后应再次提醒。
 * @param {object} task
 * @returns {string|null}
 */
export function dueTaskKey(task) {
  if (!task || task.id == null || !task.dueAt) return null
  return `${task.id}:${task.dueAt}`
}

function dueTime(task) {
  const parts = parseLocalDateTime(task?.dueAt)
  if (!parts) return null
  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  ).getTime()
}

/**
 * 从 /user/tasks/due 的返回里挑出这次应该弹的通知。
 *
 * 规则：
 * - 只处理 pending（后端 due 接口正常情况下已经过滤，这里再兜底）
 * - 到期时间 <= now，且不超过 windowMs（避免首次打开时把旧逾期任务全部弹一遍）
 * - 同一个 taskId + dueAt 只弹一次
 * - 按 dueAt 升序，单次最多 limit 条，避免一次刷屏
 *
 * @param {object[]} tasks
 * @param {{now?:number, windowMs?:number, notified?:object, limit?:number}} options
 * @returns {object[]}
 */
export function selectDueNotifications(tasks = [], options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now()
  const windowMs = Number.isFinite(options.windowMs) ? options.windowMs : DUE_NOTIFY_WINDOW_MS
  const notified = options.notified && typeof options.notified === 'object' ? options.notified : {}
  const limit = Number.isFinite(options.limit) ? Math.max(0, Math.floor(options.limit)) : 3
  if (limit === 0 || !Array.isArray(tasks)) return []

  const picked = []
  const seen = new Set()
  for (const task of tasks) {
    if (!task || (task.status && task.status !== 'pending')) continue
    const key = dueTaskKey(task)
    if (!key || notified[key] || seen.has(key)) continue
    const at = dueTime(task)
    if (at == null || at > now || now - at > windowMs) continue
    picked.push({ task, at, key })
    seen.add(key)
  }

  picked.sort((a, b) => a.at - b.at)
  return picked.slice(0, limit).map((item) => item.task)
}

/**
 * 记录一条任务 occurrence 已提醒，返回新对象（不修改入参）。
 * @param {object} notified
 * @param {object} task
 * @param {number} now
 * @returns {object}
 */
export function markDueNotified(notified, task, now = Date.now()) {
  const key = dueTaskKey(task)
  if (!key) return { ...(notified || {}) }
  return { ...(notified || {}), [key]: now }
}

/**
 * 清掉过期/非法记录，避免 localStorage 无限增长。
 * @param {object} notified
 * @param {number} now
 * @param {number} maxAgeMs
 * @returns {object}
 */
export function pruneNotified(notified, now = Date.now(), maxAgeMs = DUE_NOTIFIED_MAX_AGE_MS) {
  const out = {}
  if (!notified || typeof notified !== 'object') return out
  for (const [key, value] of Object.entries(notified)) {
    if (!Number.isFinite(value)) continue
    const age = now - value
    // 允许 1 分钟时钟回拨，避免系统时间微调把记录全清掉
    if (age >= -60 * 1000 && age <= maxAgeMs) out[key] = value
  }
  return out
}
