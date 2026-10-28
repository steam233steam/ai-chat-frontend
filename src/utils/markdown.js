import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { nextTick } from 'vue'
import { findUnclosedFence } from './fence'
import { highlightRenderer } from './codeHighlight'

// marked 配置：换行转 <br>、启用 GFM
marked.setOptions({
  breaks: true,
  gfm: true
})

// 代码围栏交给 highlight.js 渲染（未知语言回退纯文本）
marked.use({ renderer: highlightRenderer })

/**
 * 流式感知渲染：在打字机输出过程中，代码块 fence 可能尚未闭合
 * （``` 开始但没结束），直接 marked.parse 会把"未闭合的代码块"当成普通文本，
 * 导致代码闪烁/排版错乱。这里在 fence 不平衡时补一个临时 ``` 闭合，
 * 让 marked 稳定渲染为代码块；等流结束再调用 renderMarkdown 渲染最终结果。
 */
export function renderStreamingMarkdown(text) {
  if (!text) return ''
  try {
    // 未闭合围栏补齐临时闭合符，避免代码块在流式过程中被当成普通文本
    const open = findUnclosedFence(text)
    const safe = open ? text + '\n' + open.marker : text
    const raw = marked.parse(safe)
    return DOMPurify.sanitize(raw)
  } catch (error) {
    console.error('流式 Markdown 渲染失败', error)
    return DOMPurify.sanitize(text)
  }
}

/** 渲染完整 Markdown（历史消息 / 流结束后） */
export function renderMarkdown(text) {
  if (!text) return ''
  try {
    const raw = marked.parse(text)
    return DOMPurify.sanitize(raw)
  } catch (error) {
    console.error('Markdown 渲染失败', error)
    return DOMPurify.sanitize(text)
  }
}

/**
 * 复制文本，navigator.clipboard 不可用（非 HTTPS / 旧浏览器）时降级到 execCommand
 * @returns {Promise<boolean>} 是否复制成功
 */
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (_) {
      // 继续尝试降级方案
    }
  }

  const textarea = document.createElement('textarea')
  try {
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    return document.execCommand('copy')
  } catch (error) {
    console.error('复制失败', error)
    return false
  } finally {
    textarea.remove()
  }
}

// 为已渲染的 markdown 容器添加代码块复制按钮 + 语言标签
export async function enhanceCodeBlocks(container) {
  await nextTick()
  if (!container) return

  container.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy-btn')) return

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'code-copy-btn'
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
    btn.setAttribute('aria-label', '复制代码')
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.textContent || ''
      const ok = await copyText(code)
      if (ok) {
        btn.classList.add('copied')
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        setTimeout(() => btn.classList.remove('copied'), 1600)
      }
    })

    // 语言标签（优先使用 renderer 写入的 data-lang，保留用户原始写法）
    const codeEl = pre.querySelector('code')
    const lang = codeEl?.dataset?.lang || codeEl?.className?.match(/language-([\w-]+)/)?.[1]
    if (lang && !pre.querySelector('.code-lang')) {
      const langEl = document.createElement('span')
      langEl.className = 'code-lang'
      langEl.textContent = lang
      pre.appendChild(langEl)
    }

    pre.style.position = 'relative'
    pre.appendChild(btn)
  })
}

// 导出对话为 JSON
export function exportChatAsJSON(messages) {
  const exportData = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
    model: msg.model || null,
    timestamp: msg.timestamp
  }))
  return JSON.stringify(exportData, null, 2)
}

// 导出对话为文本
export function exportChatAsText(messages) {
  return messages
    .map((msg) => {
      const sender = msg.role === 'user' ? '你' : 'AI 助手'
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('zh-CN') : ''
      return `[${time}] ${sender}:\n${msg.content}\n`
    })
    .join('\n---\n\n')
}
