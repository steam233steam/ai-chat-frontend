import { ref, onScopeDispose } from 'vue'
import { findStableBoundary } from '@/utils/fence'

/**
 * 平滑打字机引擎（LobeChat 式：buffer + queue + 匀速消费）
 *
 * 性能设计：把输出文本拆成"已定型前缀 stable"和"未定型尾巴 frontier"——
 * - 前缀超过 stableLength 后不再变化（打字机只往后吐），渲染一次后缓存
 * - 只有最近 stableLength 字的 frontier 每帧变化，流式期间每帧只渲染这一小段
 * - 这样无论消息多长，流式期间每帧渲染成本都是 O(stableLength)，不是 O(全文)
 *
 * @param {object} options
 * @param {number} [options.fps=30]
 * @param {number} [options.charsPerTick=4]
 * @param {number} [options.stableLength=400] 已定型前缀与未定型尾巴的分界长度
 * @returns {{ stable, frontier, isComplete, feed, flush, reset }}
 */
export function useTypewriter(options = {}) {
  const { fps = 30, charsPerTick = 4, stableLength = 400 } = options

  const stable = ref('')
  const frontier = ref('')
  const isComplete = ref(false)

  let fullText = ''
  let stableLen = 0
  let buffer = ''
  let rafId = null
  let lastTime = 0
  let sourceEnded = false
  let settled = false

  const frameInterval = 1000 / fps

  const retargetStable = () => {
    const target = Math.max(0, fullText.length - stableLength)
    if (target <= stableLen) return
    const boundary = findStableBoundary(fullText, target, stableLen)
    if (boundary > stableLen) {
      stable.value = fullText.slice(0, boundary)
      stableLen = boundary
    }
  }

  const tick = (now) => {
    if (settled) return

    if (now - lastTime < frameInterval - 1) {
      rafId = requestAnimationFrame(tick)
      return
    }
    lastTime = now

    if (buffer) {
      const take = Math.min(buffer.length, charsPerTick)
      fullText += buffer.slice(0, take)
      buffer = buffer.slice(take)
      retargetStable()
      frontier.value = fullText.slice(stableLen)
    }

    if (sourceEnded && !buffer) {
      finalize()
      return
    }

    rafId = requestAnimationFrame(tick)
  }

  const ensureLoop = () => {
    if (rafId == null && !settled) {
      lastTime = performance.now()
      rafId = requestAnimationFrame(tick)
    }
  }

  const feed = (chunk) => {
    if (settled || !chunk) return
    buffer += chunk
    ensureLoop()
  }

  const finalize = () => {
    if (settled) return
    settled = true
    isComplete.value = true
    stable.value = fullText
    stableLen = fullText.length
    frontier.value = ''
    if (rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const flush = () => {
    if (settled) return
    sourceEnded = true
    if (buffer) {
      fullText += buffer
      buffer = ''
    }
    finalize()
  }

  const reset = () => {
    if (rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    settled = false
    sourceEnded = false
    buffer = ''
    fullText = ''
    stableLen = 0
    stable.value = ''
    frontier.value = ''
    isComplete.value = false
  }

  onScopeDispose(() => {
    if (rafId != null) cancelAnimationFrame(rafId)
  })

  return { stable, frontier, isComplete, feed, flush, reset }
}
