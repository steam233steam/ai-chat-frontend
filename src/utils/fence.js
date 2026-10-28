/**
 * Markdown 代码围栏工具。
 *
 * 流式输出时文本可能停在未闭合的 ``` / ~~~ 中间。如果直接分段渲染，
 * stable 前缀和 frontier 尾巴会各自补一个闭合围栏，最终渲染成两个代码块。
 * 这里提供与渲染逻辑一致的最小围栏扫描器。
 */

/**
 * 找到 [from, to) 区间内仍未闭合的代码围栏。
 * @returns {{ index: number, marker: string } | null}
 */
export function findUnclosedFence(text, from = 0, to = text.length) {
  if (!text) return null

  const re = /```|~~~/g
  re.lastIndex = from
  let open = null
  let match

  while ((match = re.exec(text)) !== null) {
    if (match.index >= to) break
    if (!open) {
      open = { index: match.index, marker: match[0] }
    } else if (open.marker === match[0]) {
      open = null
    }
  }

  return open
}

/**
 * 计算可安全冻结的 Markdown 前缀长度。
 * - 尽量在换行处切分，避免把一行拆成两个 Markdown 块
 * - 如果切分点落在未闭合的代码围栏内，退回到围栏开始处，
 *   把整个代码块留给 frontier 做流式渲染
 *
 * stable 前缀本身必须始终处于围栏平衡状态（由本函数保证）。
 */
export function findStableBoundary(text, target, stableLen = 0) {
  if (target <= stableLen) return stableLen

  let boundary = text.lastIndexOf('\n', target)
  if (boundary <= stableLen) boundary = target

  const open = findUnclosedFence(text, stableLen, boundary)
  if (open) {
    const lineStart = text.lastIndexOf('\n', open.index)
    boundary = lineStart > stableLen ? lineStart : stableLen
  }

  return Math.min(boundary, text.length)
}
