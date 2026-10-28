import hljs from 'highlight.js/lib/core'
import plaintext from 'highlight.js/lib/languages/plaintext'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import markdown from 'highlight.js/lib/languages/markdown'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import yaml from 'highlight.js/lib/languages/yaml'
import diff from 'highlight.js/lib/languages/diff'

const languages = {
  plaintext,
  javascript,
  typescript,
  python,
  java,
  bash,
  json,
  sql,
  xml,
  css,
  markdown,
  go,
  rust,
  c,
  cpp,
  csharp,
  yaml,
  diff
}

for (const [name, definition] of Object.entries(languages)) {
  hljs.registerLanguage(name, definition)
}

// 常见 infostring 与 highlight.js 语言名不一致时做映射
const LANGUAGE_ALIASES = {
  vue: 'xml',
  html: 'xml',
  htm: 'xml',
  jsonc: 'json',
  json5: 'json',
  text: 'plaintext',
  txt: 'plaintext',
  plain: 'plaintext',
  console: 'bash',
  shell: 'bash',
  'c++': 'cpp',
  'c#': 'csharp'
}

const escapeHtml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const escapeAttr = (text) => escapeHtml(text).replace(/'/g, '&#39;')

/**
 * 高亮一段代码。未知语言 / 无语言时回退为纯文本转义。
 * @param {string} source
 * @param {string} [info] Markdown 围栏后的 infostring，如 "js title=demo"
 */
export function highlightCode(source, info) {
  const raw = (info || '').trim().split(/\s+/)[0] || ''
  const requested = raw.toLowerCase()
  const resolved = LANGUAGE_ALIASES[requested] || requested
  const language = resolved && hljs.getLanguage(resolved) ? resolved : 'plaintext'

  try {
    return {
      html: hljs.highlight(source, { language }).value,
      language: language === 'plaintext' ? '' : language,
      label: raw
    }
  } catch (_) {
    return { html: escapeHtml(source), language: '', label: raw }
  }
}

/** marked v18 renderer：把代码围栏渲染成带语言标记的高亮代码块 */
export const highlightRenderer = {
  code({ text, lang }) {
    const { html, language, label } = highlightCode(text, lang)
    const classes = ['hljs']
    if (language) classes.push(`language-${language}`)
    const attrs = label ? ` data-lang="${escapeAttr(label)}"` : ''
    return `<pre class="code-block"><code class="${classes.join(' ')}"${attrs}>${html}</code></pre>\n`
  }
}
