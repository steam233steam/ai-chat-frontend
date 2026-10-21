import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { nextTick } from 'vue'

// marked v5+ 已移除 highlight 选项，代码高亮如需启用请接入 highlight.js / shiki
marked.setOptions({
  breaks: true,
  gfm: true
})

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

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch (error) {
    console.error('复制失败', error)
    return false
  }
}

// 为已渲染的 markdown 容器添加代码块复制按钮
export async function enhanceCodeBlocks(container) {
  await nextTick()
  if (!container) return

  container.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy-btn')) return

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'code-copy-btn'
    btn.textContent = '复制'
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.textContent || ''
      const ok = await copyText(code)
      btn.textContent = ok ? '已复制' : '复制失败'
      setTimeout(() => { btn.textContent = '复制' }, 2000)
    })

    pre.style.position = 'relative'
    pre.appendChild(btn)
  })
}

// 导出对话为 JSON
export function exportChatAsJSON(messages) {
  const exportData = messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp
  }))
  return JSON.stringify(exportData, null, 2)
}

// 导出对话为文本
export function exportChatAsText(messages) {
  return messages.map(msg => {
    const sender = msg.role === 'user' ? '你' : 'AI 助手'
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('zh-CN') : ''
    return `[${time}] ${sender}:\n${msg.content}\n`
  }).join('\n---\n\n')
}
