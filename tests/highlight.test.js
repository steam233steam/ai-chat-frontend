import test from 'node:test'
import assert from 'node:assert/strict'
import { highlightCode } from '../src/utils/codeHighlight.js'

test('highlightCode: 已知语言输出高亮 span', () => {
  const result = highlightCode('const a = 1', 'js')
  assert.equal(result.language, 'js')
  assert.equal(result.label, 'js')
  assert.match(result.html, /hljs-keyword/)
})

test('highlightCode: 未知语言回退为纯文本并转义 HTML', () => {
  const result = highlightCode('<script>alert(1)</script>', 'unknown-lang')
  assert.equal(result.language, '')
  assert.equal(result.label, 'unknown-lang')
  assert.ok(!result.html.includes('<script>'))
  assert.match(result.html, /&lt;script&gt;/)
})

test('highlightCode: vue / html 映射到 xml', () => {
  assert.equal(highlightCode('<template><div /></template>', 'vue').language, 'xml')
  assert.equal(highlightCode('<div>hi</div>', 'html').language, 'xml')
})

test('highlightCode: 无语言时按纯文本输出', () => {
  const result = highlightCode('plain text', '')
  assert.equal(result.language, '')
  assert.equal(result.label, '')
  assert.equal(result.html, 'plain text')
})
