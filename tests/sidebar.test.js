import test from 'node:test'
import assert from 'node:assert/strict'

import {
  memoryKeyLabel,
  memoryTypeLabel,
  sessionMemoryCounts,
  sortTasks,
  splitMemories,
  taskDueText,
  taskRecurrenceText,
  taskSourceSessionId,
  taskStatusLabel
} from '../src/utils/sidebar.js'

test('splitMemories 按会话拆分全局记忆和会话级记忆', () => {
  const memories = [
    { id: 1, memKey: 'goal', content: '转后端', sessionId: null },
    { id: 2, memKey: 'relation', content: '猫娘', sessionId: 's1' },
    { id: 3, memKey: 'style', content: '简洁', sessionId: 's1' },
    { id: 4, memKey: 'style', content: '全局风格' },
    null
  ]

  const grouped = splitMemories(memories)
  assert.deepEqual(grouped.global.map(m => m.id), [1, 4])
  assert.deepEqual(grouped.bySession.s1.map(m => m.id), [2, 3])
  assert.equal(grouped.bySession.s2, undefined)
})

test('splitMemories / sessionMemoryCounts 兼容空数组', () => {
  assert.deepEqual(splitMemories(), { global: [], bySession: {} })
  assert.deepEqual(sessionMemoryCounts(), {})
  assert.deepEqual(
    sessionMemoryCounts([{ id: 1, sessionId: 's1' }, { id: 2, sessionId: 's1' }, { id: 3 }]),
    { s1: 2 }
  )
})

test('记忆与任务展示文案有中文映射和兜底', () => {
  assert.equal(memoryKeyLabel('fact'), '事实')
  assert.equal(memoryKeyLabel('style'), '回答风格')
  assert.equal(memoryKeyLabel('custom'), 'custom')
  assert.equal(memoryKeyLabel(null), '记忆')
  assert.equal(memoryTypeLabel('stable'), '长期')
  assert.equal(memoryTypeLabel('dynamic'), '动态')
  assert.equal(memoryTypeLabel('other'), '')
  assert.equal(taskStatusLabel('pending'), '待办')
  assert.equal(taskStatusLabel('done'), '已完成')
  assert.equal(taskStatusLabel('cancelled'), '已取消')
})

test('sortTasks 待办按逾期、截止时间、无截止时间排序', () => {
  const tasks = [
    { id: 1, title: '无时间', status: 'pending' },
    { id: 2, title: '明天', status: 'pending', dueAt: '2026-11-06T09:00:00' },
    { id: 3, title: '已逾期', status: 'pending', dueAt: '2026-11-04T09:00:00', overdue: true },
    { id: 4, title: '今天', status: 'pending', dueAt: '2026-11-05T09:00:00' }
  ]

  assert.deepEqual(sortTasks(tasks).map(t => t.id), [3, 4, 2, 1])
})

test('sortTasks 已完成任务按最近完成时间倒序', () => {
  const tasks = [
    { id: 1, status: 'done', completedAt: '2026-11-04T09:00:00' },
    { id: 2, status: 'done', completedAt: '2026-11-05T09:00:00' },
    { id: 3, status: 'done', updateTime: '2026-11-03T09:00:00' }
  ]

  assert.deepEqual(sortTasks(tasks).map(t => t.id), [2, 1, 3])
})

test('任务时间、重复规则和来源会话', () => {
  assert.equal(taskDueText({ dueAt: '2026-11-06T09:00:00' }), '11-06 09:00')
  assert.equal(taskDueText({}), '无截止时间')
  assert.equal(taskRecurrenceText({ recurrence: 'weekly', recurrenceRule: 'BYDAY=FR' }), '每周五')
  assert.equal(taskRecurrenceText({}), '单次')
  assert.equal(taskSourceSessionId({ createdFromSession: ' s1 ' }), 's1')
  assert.equal(taskSourceSessionId({}), null)
})
