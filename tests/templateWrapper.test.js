import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// 裸 <template> 在 Vue 里会渲染成原生 template 元素，其子节点不会被挂载，
// 表现为「整块内容凭空消失」。这里禁止除根节点外的无指令 <template>。
const walk = (dir) => {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (name.endsWith('.vue')) out.push(full)
  }
  return out
}

const DIRECTIVE = /(\bv-if\b|\bv-else-if\b|\bv-else\b|\bv-for\b|\bv-slot\b|#\w)/

test('vue 文件里没有无指令的 <template> 包裹（否则子节点不渲染）', () => {
  const offenders = []
  for (const file of walk('src')) {
    const source = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '')
    const matches = [...source.matchAll(/<template\b([^>]*)>/g)]
    matches.forEach((match, index) => {
      if (index === 0) return // 根 template
      if (DIRECTIVE.test(match[1])) return
      const line = source.slice(0, match.index).split('\n').length
      offenders.push(`${file}:${line}`)
    })
  }
  assert.deepEqual(offenders, [], `发现无指令的 <template> 包裹：${offenders.join(', ')}`)
})