import test from 'node:test'
import assert from 'node:assert/strict'

import { SSEParser } from '../src/utils/sse.js'

const collect = () => {
  const events = []
  const parser = new SSEParser((data) => events.push(data))
  return { events, parser }
}

test('保留 chunk 的前导空格，避免英文单词粘连', () => {
  const { events, parser } = collect()
  // Spring 编码器输出 "data:" + chunk，冒号后没有空格
  parser.feed('data:Hello\n\ndata: world\n\ndata:!\n\n')
  assert.deepEqual(events, ['Hello', ' world', '!'])
  assert.equal(events.join(''), 'Hello world!')
})

test('支持跨 chunk 的分片（包括分隔符被切断）', () => {
  const { events, parser } = collect()
  parser.feed('data:你')
  parser.feed('好\n')
  parser.feed('\ndata:世界\n\n')
  assert.deepEqual(events, ['你好', '世界'])
})

test('同一事件的多行 data 用换行拼接（后端把 \n 编码成 \ndata:）', () => {
  const { events, parser } = collect()
  parser.feed('data:第一行\ndata:第二行\n\n')
  assert.deepEqual(events, ['第一行\n第二行'])
})

test('chunk 自身包含换行时不会丢内容', () => {
  const { events, parser } = collect()
  // 值为 "\n\n" 时，Spring 写出 data:\ndata:\ndata:\n\n
  parser.feed('data:\ndata:\ndata:\n\n')
  assert.deepEqual(events, ['\n\n'])
})

test('兼容 CRLF 事件分隔符', () => {
  const { events, parser } = collect()
  parser.feed('data:a\r\n\r\ndata:b\r\n\r\n')
  assert.deepEqual(events, ['a', 'b'])
})

test('忽略注释行与 event/id/retry 字段，保留 [DONE]', () => {
  const { events, parser } = collect()
  parser.feed(': keep-alive\n\nevent: message\nid: 1\ndata:hi\n\ndata:[DONE]\n\n')
  assert.deepEqual(events, ['hi', '[DONE]'])
})

test('空 data 事件不触发回调', () => {
  const { events, parser } = collect()
  parser.feed('data:\n\ndata:x\n\n')
  assert.deepEqual(events, ['x'])
})

test('flush 处理结尾没有空行的残留事件，纯空白则忽略', () => {
  const first = collect()
  first.parser.feed('data:tail')
  first.parser.flush()
  assert.deepEqual(first.events, ['tail'])

  const second = collect()
  second.parser.feed('\n\n')
  second.parser.flush()
  assert.deepEqual(second.events, [])
})

test('stop 之后不再产生事件', () => {
  const { events, parser } = collect()
  parser.feed('data:a\n\n')
  parser.stop()
  parser.feed('data:b\n\n')
  parser.flush()
  assert.deepEqual(events, ['a'])
})
