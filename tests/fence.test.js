import test from 'node:test'
import assert from 'node:assert/strict'
import { findUnclosedFence, findStableBoundary } from '../src/utils/fence.js'

test('findUnclosedFence: 平衡的围栏返回 null', () => {
  const text = 'before\n```js\nconst a = 1\n```\nafter'
  assert.equal(findUnclosedFence(text), null)
})

test('findUnclosedFence: 未闭合的 ``` 返回起始位置', () => {
  const text = 'before\n```js\nconst a = 1'
  assert.deepEqual(findUnclosedFence(text), { index: 7, marker: '```' })
})

test('findUnclosedFence: 支持 ~~~ 围栏', () => {
  const text = '~~~python\nprint(1)'
  assert.deepEqual(findUnclosedFence(text), { index: 0, marker: '~~~' })
})

test('findUnclosedFence: 只扫描 [from, to) 区间', () => {
  const text = '```js\nx\n```\n```js\ny'
  assert.equal(findUnclosedFence(text, 0, 10), null)
  assert.deepEqual(findUnclosedFence(text, 10), { index: 12, marker: '```' })
})

test('findStableBoundary: 普通文本在换行处切分', () => {
  const text = 'line1\nline2\nline3\nline4'
  const target = text.indexOf('\nline4')
  assert.equal(findStableBoundary(text, target), target)
})

test('findStableBoundary: 不把未闭合代码块切进 stable 前缀', () => {
  const text = 'intro\n```js\n' + 'const value = 1\n'.repeat(50)
  const target = Math.floor(text.length / 2)
  const boundary = findStableBoundary(text, target)
  assert.equal(boundary, 5) // 退回到 ``` 前的换行
  assert.equal(findUnclosedFence(text.slice(0, boundary)), null)
})

test('findStableBoundary: 代码块闭合后可以继续推进', () => {
  const text = 'intro\n```js\nconst a = 1\n```\n' + 'after\n'.repeat(20)
  const target = text.length
  const boundary = findStableBoundary(text, target)
  assert.ok(boundary > text.indexOf('```'))
  assert.equal(findUnclosedFence(text.slice(0, boundary)), null)
})

test('findStableBoundary: target 未超过 stableLen 时不回退', () => {
  const text = '```js\nunclosed'
  assert.equal(findStableBoundary(text, 3, 5), 5)
})
