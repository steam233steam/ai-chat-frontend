import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DUE_NOTIFY_WINDOW_MS,
  dueTaskKey,
  markDueNotified,
  pruneNotified,
  selectDueNotifications
} from '../src/utils/dueTasks.js'

const at = (year, month, day, hour, minute, second = 0) =>
  new Date(year, month - 1, day, hour, minute, second).getTime()

const task = (id, dueAt, status = 'pending') => ({ id, dueAt, status, title: `任务${id}` })

test('dueTaskKey 用 taskId + dueAt 区分重复任务的每次 occurrence', () => {
  assert.equal(dueTaskKey(task(1, '2026-11-05T09:00:00')), '1:2026-11-05T09:00:00')
  assert.notEqual(
    dueTaskKey(task(1, '2026-11-05T09:00:00')),
    dueTaskKey(task(1, '2026-11-06T09:00:00'))
  )
  assert.equal(dueTaskKey({ id: 1 }), null)
  assert.equal(dueTaskKey(null), null)
})

test('selectDueNotifications 只选窗口内的到期任务', () => {
  const now = at(2026, 11, 5, 9, 0)
  const tasks = [
    task(1, '2026-11-05T08:55:00'), // 5 分钟前，窗口内
    task(2, '2026-11-05T08:40:00'), // 20 分钟前，太旧
    task(3, '2026-11-05T09:05:00'), // 未来
    task(4, '2026-11-05T09:00:00'), // 刚好到点
    task(5, '2026-11-05T08:54:00', 'done') // 非 pending
  ]

  assert.deepEqual(
    selectDueNotifications(tasks, { now }).map((item) => item.id),
    [1, 4]
  )
})

test('selectDueNotifications 按 taskId + dueAt 去重，并限制单次条数', () => {
  const now = at(2026, 11, 5, 9, 0)
  const tasks = [
    task(1, '2026-11-05T08:59:00'),
    task(1, '2026-11-05T08:59:00'),
    task(2, '2026-11-05T08:58:00'),
    task(3, '2026-11-05T08:57:00'),
    task(4, '2026-11-05T08:56:00')
  ]
  const notified = markDueNotified({}, tasks[1], now - 1000)

  assert.deepEqual(
    selectDueNotifications(tasks, { now, notified }).map((item) => item.id),
    [4, 3, 2]
  )
  assert.deepEqual(
    selectDueNotifications(tasks, { now, notified, limit: 2 }).map((item) => item.id),
    [4, 3]
  )
})

test('markDueNotified / pruneNotified 保持不可变并清理过期记录', () => {
  const now = at(2026, 11, 5, 9, 0)
  const original = { old: now - DUE_NOTIFY_WINDOW_MS }
  const next = markDueNotified(original, task(1, '2026-11-05T09:00:00'), now)

  assert.deepEqual(original, { old: now - DUE_NOTIFY_WINDOW_MS })
  assert.equal(next['1:2026-11-05T09:00:00'], now)

  const pruned = pruneNotified(
    {
      fresh: now - 1000,
      stale: now - 31 * 24 * 60 * 60 * 1000,
      invalid: 'not-a-number'
    },
    now
  )
  assert.deepEqual(pruned, { fresh: now - 1000 })
})
