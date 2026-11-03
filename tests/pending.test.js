import test from 'node:test'
import assert from 'node:assert/strict'

import {
  confirmResultText,
  extractPendingId,
  formatCountdown,
  formatDueAt,
  formatRecurrence,
  parseLocalDateTime,
  pendingCounts,
  pendingDescription,
  pendingDialogTitle,
  pendingPrimaryText,
  pendingRemainingSeconds,
  stripMbMarker
} from '../src/utils/pending.js'
import { SSEParser } from '../src/utils/sse.js'

test('extractPendingId 解析聊天文案尾部的待确认标记', () => {
  assert.equal(extractPendingId('确认吗？\n[[MB:pending=42]]'), 42)
  assert.equal(extractPendingId('[[MB:pending=7]]前缀'), 7)
  assert.equal(extractPendingId('普通聊天'), null)
  assert.equal(extractPendingId(''), null)
  assert.equal(extractPendingId(null), null)
})

test('stripMbMarker 剥离全部标记，不破坏正常文案', () => {
  assert.equal(stripMbMarker('确认吗？\n[[MB:pending=42]]'), '确认吗？')
  assert.equal(stripMbMarker('[[MB:pending=1]]中间[[MB:pending=2]]'), '中间')
  assert.equal(stripMbMarker('普通聊天'), '普通聊天')
  assert.equal(stripMbMarker(null), '')
})

test('parseLocalDateTime 按字面量解析，不把无时区时间当 UTC', () => {
  assert.deepEqual(parseLocalDateTime('2026-11-04T09:05:06'), {
    year: 2026,
    month: 11,
    day: 4,
    hour: 9,
    minute: 5,
    second: 6
  })
  assert.deepEqual(parseLocalDateTime('2026-11-04 09:05'), {
    year: 2026,
    month: 11,
    day: 4,
    hour: 9,
    minute: 5,
    second: 0
  })
  assert.equal(parseLocalDateTime('not-a-date'), null)
})

test('formatDueAt 输出中文日期 + 星期 + 时间', () => {
  assert.equal(formatDueAt('2026-11-04T09:00:00'), '2026-11-04（周三） 09:00')
  assert.equal(formatDueAt('2026-11-04 09:00'), '2026-11-04（周三） 09:00')
  assert.equal(formatDueAt('2026-11-04T09:00:00', { withWeekday: false }), '2026-11-04 09:00')
  assert.equal(formatDueAt('2026-11-04T09:00:00', { compact: true }), '11-04 09:00')
  assert.equal(formatDueAt('随便什么'), '随便什么')
  assert.equal(formatDueAt(null), '')
})

test('formatRecurrence 覆盖 once/daily/weekly/monthly', () => {
  assert.equal(formatRecurrence('once', null), '单次')
  assert.equal(formatRecurrence(null, null), '单次')
  assert.equal(formatRecurrence('daily', null), '每天')
  assert.equal(formatRecurrence('weekly', 'BYDAY=MO'), '每周一')
  assert.equal(formatRecurrence('weekly', 'BYDAY=SU'), '每周日')
  assert.equal(formatRecurrence('weekly', null), '每周')
  assert.equal(formatRecurrence('monthly', null), '每月')
})

test('pendingRemainingSeconds 只按本地时间计算，过期返回 0', () => {
  const now = new Date(2026, 10, 3, 18, 29, 0).getTime()
  assert.equal(pendingRemainingSeconds('2026-11-03T18:30:00', now), 60)
  assert.equal(pendingRemainingSeconds('2026-11-03T18:28:00', now), 0)
  assert.equal(pendingRemainingSeconds('bad', now), null)
  assert.equal(pendingRemainingSeconds(null, now), null)
})

test('formatCountdown 输出 mm:ss / h:mm:ss', () => {
  assert.equal(formatCountdown(598), '09:58')
  assert.equal(formatCountdown(3723), '1:02:03')
  assert.equal(formatCountdown(0), '00:00')
  assert.equal(formatCountdown(null), '')
})

test('pendingCounts / 标题 / 主按钮文案按任务和记忆数量切换', () => {
  const task = { id: 1, action: 'create', title: '交作业' }
  const memory = { key: 'style', value: '简洁' }

  const taskOnly = { tasks: [task], memories: [] }
  assert.deepEqual(pendingCounts(taskOnly), { tasks: 1, memories: 0, total: 1 })
  assert.equal(pendingDialogTitle(taskOnly), '确认创建任务')
  assert.equal(pendingPrimaryText(taskOnly), '创建任务')

  const tasksOnly = { tasks: [task, { ...task, id: 2 }], memories: [] }
  assert.equal(pendingDialogTitle(tasksOnly), '确认创建 2 个任务')
  assert.equal(pendingPrimaryText(tasksOnly), '全部创建（2）')

  const memoryOnly = { tasks: [], memories: [memory] }
  assert.equal(pendingDialogTitle(memoryOnly), '确认保存记忆')
  assert.equal(pendingPrimaryText(memoryOnly), '保存记忆')

  const mixed = { tasks: [task], memories: [memory] }
  assert.equal(pendingDialogTitle(mixed), '确认保存内容')
  assert.equal(pendingPrimaryText(mixed), '全部确认')
  assert.equal(
    pendingDescription(mixed),
    'AI 从聊天里识别到 1 个任务、1 条记忆。确认后才会写入你的个人数据。'
  )
})

test('confirmResultText 汇总确认结果并处理幂等响应', () => {
  assert.equal(
    confirmResultText({ alreadyConfirmed: false, tasks: [{ id: 1 }], memories: [] }),
    '已保存 1 个任务'
  )
  assert.equal(
    confirmResultText({
      alreadyConfirmed: false,
      tasks: [{ id: 1 }],
      memories: [{ id: 2 }]
    }),
    '已保存 1 个任务、1 条记忆'
  )
  assert.equal(confirmResultText({ alreadyConfirmed: true, tasks: [], memories: [] }), '这条内容此前已经确认过了')
})


test('SSE 多行 data 合并后仍能提取 pendingId（后端流式确认契约）', () => {
  const events = []
  const parser = new SSEParser((data) => events.push(data))
  parser.feed('data:我识别到 1 个任务，确认吗？\ndata:[[MB:pending=42]]\n\n')
  assert.deepEqual(events, ['我识别到 1 个任务，确认吗？\n[[MB:pending=42]]'])
  assert.equal(extractPendingId(events.join('')), 42)
})
