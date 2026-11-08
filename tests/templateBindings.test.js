import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'src')

function collectFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(full))
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

function definedNames(script) {
  const names = new Set()
  const add = (s) => s.split(',').forEach((n) => {
    const v = n.trim().replace(/^\.\.\./, '').split(':')[0].split('=')[0].trim()
    if (/^[A-Za-z_$][\w$]*$/.test(v)) names.add(v)
  })

  for (const m of script.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1])
  for (const m of script.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1])
  for (const m of script.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from/g)) names.add(m[1])
  for (const m of script.matchAll(/import\s*\{([^}]*)\}\s*from/g)) add(m[1])
  for (const m of script.matchAll(/\bconst\s*\{([^}]*)\}\s*=\s*defineProps/g)) add(m[1])
  for (const m of script.matchAll(/defineProps\(\s*\{([\s\S]*?)\}\s*\)/g)) {
    for (const k of m[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)) names.add(k[1])
    for (const k of m[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*,/gm)) names.add(k[1])
  }
  for (const m of script.matchAll(/defineProps\(\s*\[([^\]]*)\]/g)) add(m[1].replace(/'/g, ''))
  return names
}

const RESERVED = new Set(['true', 'false', 'null', 'undefined', 'this', 'Math', 'Date', 'JSON', 'String', 'Number', 'Boolean', 'Object', 'Array'])

test('模板里引用的顶层变量都必须在 script 里定义', () => {
  const problems = []
  for (const file of collectFiles(ROOT)) {
    const source = fs.readFileSync(file, 'utf8')
    const tplStart = source.indexOf('<template>')
    const tplEnd = source.lastIndexOf('</template>')
    const scriptStart = source.indexOf('<script setup>')
    const scriptEnd = source.lastIndexOf('</script>')
    if (tplStart < 0 || scriptStart < 0) continue

    const tpl = source.slice(tplStart + 10, tplEnd)
    const script = source.slice(scriptStart + 14, scriptEnd)
    const defined = definedNames(script)

    // v-for 循环变量
    const loopVars = new Set()
    for (const m of tpl.matchAll(/v-for="(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s+in\s+/g)) {
      const list = (m[1] || m[2] || '').split(',')
      for (const item of list) {
        const v = item.trim().split(/\s/)[0]
        if (/^[A-Za-z_$][\w$]*$/.test(v)) loopVars.add(v)
      }
    }

    // 只检查 {{ ident }} 和 {{ ident.xxx }} 这种顶层标识符
    for (const m of tpl.matchAll(/\{\{\s*([A-Za-z_$][\w$]*)/g)) {
      const name = m[1]
      if (defined.has(name) || loopVars.has(name) || RESERVED.has(name)) continue
      problems.push(`${path.relative(process.cwd(), file)} → {{ ${name} }}`)
    }
  }
  assert.deepEqual(problems, [], '模板引用了未定义的变量：\n' + problems.join('\n'))
})