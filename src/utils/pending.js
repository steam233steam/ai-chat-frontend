/**
 * MindButler 待确认动作的前端纯工具函数。
 *
 * 后端在命中"任务/记忆提取"时，会在聊天文案尾部追加：
 *   [[MB:pending=42]]
 * 这个标记只给机器读，展示/复制/导出前必须剥离。
 *
 * 这里刻意不依赖 Vue / 浏览器 API，方便用 node --test 做纯单测。
 */

const PENDING_MARKER = /\[\[MB:pending=(\d+)]]/g
const LOCAL_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/**
 * 从文案中提取 pending id。
 * @param {string} text
 * @returns {number|null}
 */
export function extractPendingId(text) {
  if (!text) return null
  PENDING_MARKER.lastIndex = 0
  const match = PENDING_MARKER.exec(text)
  PENDING_MARKER.lastIndex = 0
  return match ? Number(match[1]) : null
}

/**
 * 剥离所有 pending 标记（展示、复制、导出前调用）。
 * @param {string} text
 * @returns {string}
 */
export function stripMbMarker(text) {
  if (!text) return ''
  return text.replace(PENDING_MARKER, '').trim()
}

/**
 * 手动解析后端返回的 LocalDateTime 字符串，避免浏览器把无时区时间
 * 当成 UTC 后产生 8 小时偏移。
 * @param {string|number|Date} value
 * @returns {{year:number,month:number,day:number,hour:number,minute:number,second:number}|null}
 */
export function parseLocalDateTime(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
      hour: value.getHours(),
      minute: value.getMinutes(),
      second: value.getSeconds()
    }
  }

  const match = LOCAL_DATE_TIME.exec(String(value))
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] || 0)
  }
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function weekdayOf(parts) {
  // 用本地日期构造，星期只由年月日决定，不受时区偏移影响
  return WEEKDAYS[new Date(parts.year, parts.month - 1, parts.day).getDay()]
}

/**
 * 任务时间展示。
 * @param {string} value
 * @param {{compact?: boolean, withWeekday?: boolean}} options
 * @returns {string}
 */
export function formatDueAt(value, options = {}) {
  const parts = parseLocalDateTime(value)
  if (!parts) return value ? String(value) : ''

  if (options.compact) {
    return `${pad(parts.month)}-${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}`
  }

  const date = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
  const time = `${pad(parts.hour)}:${pad(parts.minute)}`
  const weekday = options.withWeekday === false ? '' : `（${weekdayOf(parts)}）`
  return `${date}${weekday} ${time}`
}

/**
 * 重复规则展示：once → 单次；daily → 每天；weekly + BYDAY=MO → 每周一。
 * @param {string} recurrence
 * @param {string|null} rule
 * @returns {string}
 */
export function formatRecurrence(recurrence, rule) {
  if (!recurrence || recurrence === 'once') return '单次'
  if (recurrence === 'daily') return '每天'
  if (recurrence === 'monthly') return '每月'
  if (recurrence === 'weekly') {
    const day = rule?.startsWith('BYDAY=') ? rule.slice('BYDAY='.length) : ''
    const labels = {
      MO: '一',
      TU: '二',
      WE: '三',
      TH: '四',
      FR: '五',
      SA: '六',
      SU: '日'
    }
    return labels[day] ? `每周${labels[day]}` : '每周'
  }
  return recurrence
}

/**
 * 距离 pending 过期的剩余秒数；无 expiresAt / 格式错误返回 null。
 * @param {string} expiresAt
 * @param {number} now 毫秒时间戳（便于测试）
 * @returns {number|null}
 */
export function pendingRemainingSeconds(expiresAt, now = Date.now()) {
  const parts = parseLocalDateTime(expiresAt)
  if (!parts) return null
  const expires = new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  ).getTime()
  return Math.max(0, Math.floor((expires - now) / 1000))
}

/**
 * 倒计时展示：09:58 / 1:02:03。
 * @param {number|null} seconds
 * @returns {string}
 */
export function formatCountdown(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return ''
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(rest)}`
  return `${pad(minutes)}:${pad(rest)}`
}

/**
 * 待确认内容计数。
 * @param {object|null} data
 * @returns {{tasks:number, memories:number, total:number}}
 */
export function pendingCounts(data) {
  const tasks = Array.isArray(data?.tasks) ? data.tasks.length : 0
  const memories = Array.isArray(data?.memories) ? data.memories.length : 0
  return { tasks, memories, total: tasks + memories }
}

/**
 * 弹窗标题。
 * @param {object|null} data
 * @returns {string}
 */
export function pendingDialogTitle(data) {
  const { tasks, memories } = pendingCounts(data)
  if (tasks > 0 && memories === 0) return tasks > 1 ? `确认创建 ${tasks} 个任务` : '确认创建任务'
  if (memories > 0 && tasks === 0) return memories > 1 ? `确认保存 ${memories} 条记忆` : '确认保存记忆'
  return '确认保存内容'
}

/**
 * 主按钮文案。
 * @param {object|null} data
 * @returns {string}
 */
export function pendingPrimaryText(data) {
  const { tasks, memories } = pendingCounts(data)
  if (tasks > 0 && memories === 0) return tasks > 1 ? `全部创建（${tasks}）` : '创建任务'
  if (memories > 0 && tasks === 0) return memories > 1 ? `全部保存（${memories}）` : '保存记忆'
  return '全部确认'
}

/**
 * 聊天里的确认文案，用于弹窗顶部解释。
 * @param {object|null} data
 * @returns {string}
 */
export function pendingDescription(data) {
  const { tasks, memories } = pendingCounts(data)
  const parts = []
  if (tasks > 0) parts.push(`${tasks} 个任务`)
  if (memories > 0) parts.push(`${memories} 条记忆`)
  if (parts.length === 0) return '确认以下内容？'
  return `AI 从聊天里识别到 ${parts.join('、')}。确认后才会写入你的个人数据。`
}

/**
 * 确认结果 → 一句成功提示。
 * @param {object|null} result ConfirmResult
 * @returns {string}
 */
export function confirmResultText(result) {
  if (!result) return '已确认'
  if (result.alreadyConfirmed) return '这条内容此前已经确认过了'
  const tasks = Array.isArray(result.tasks) ? result.tasks.length : 0
  const memories = Array.isArray(result.memories) ? result.memories.length : 0
  const parts = []
  if (tasks > 0) parts.push(`${tasks} 个任务`)
  if (memories > 0) parts.push(`${memories} 条记忆`)
  return parts.length > 0 ? `已保存 ${parts.join('、')}` : '已确认'
}
