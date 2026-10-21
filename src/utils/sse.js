/**
 * 极简 SSE（text/event-stream）解析器。
 *
 * 后端使用 Spring MVC 的 SSE 编码器输出，实际格式是：
 *   data:{chunk}\n\n
 * 注意冒号后面 **没有** 空格，chunk 内部的换行会被写成 "\ndata:"。
 * 因此这里不能对 data 内容做 trim()，否则会吃掉模型输出 token 的前导空格
 * （例如 " world" 变成 "world"，英文单词会粘连）。
 *
 * 解析规则参考 WHATWG 规范，但保留 data 的原始空白：
 * - 事件之间以空行分隔，兼容 \n\n、\r\n\r\n、\r\r
 * - 同一事件内的多行 data 用 \n 重新拼接
 * - 忽略注释行（以 ":" 开头）以及 event/id/retry 字段
 */

const EVENT_SEPARATORS = ['\r\n\r\n', '\n\n', '\r\r']
const LINE_BREAK = /\r\n|\r|\n/

function findEventBoundary(buffer) {
  let index = -1
  let length = 0

  for (const separator of EVENT_SEPARATORS) {
    const found = buffer.indexOf(separator)
    if (found !== -1 && (index === -1 || found < index)) {
      index = found
      length = separator.length
    }
  }

  return { index, length }
}

function parseEventBlock(raw) {
  const dataLines = []

  for (const line of raw.split(LINE_BREAK)) {
    if (!line || line.startsWith(':')) continue

    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    if (field !== 'data') continue

    // 只去掉 "data:" 前缀，保留内容里的空格
    dataLines.push(colon === -1 ? '' : line.slice(colon + 1))
  }

  return dataLines.length > 0 ? dataLines.join('\n') : null
}

export class SSEParser {
  /**
   * @param {(data: string) => void} onEvent 每收到一个非空事件回调一次
   */
  constructor(onEvent) {
    this.onEvent = onEvent
    this.buffer = ''
    this.stopped = false
  }

  feed(chunk) {
    if (this.stopped || !chunk) return
    this.buffer += chunk
    this.#drain()
  }

  /**
   * 流结束时调用：处理最后一个缺少空行结束符的事件。
   * 按规范未完成的事件应当丢弃，但服务端在连接关闭时可能直接截断，
   * 这里选择把已收到的内容交出去，避免丢字。
   */
  flush() {
    if (this.stopped) return

    const rest = this.buffer
    this.buffer = ''
    if (!rest || !rest.trim()) return

    this.#emit(rest)
  }

  /** 停止解析（例如收到 [DONE] 后） */
  stop() {
    this.stopped = true
    this.buffer = ''
  }

  #drain() {
    while (!this.stopped) {
      const { index, length } = findEventBoundary(this.buffer)
      if (index === -1) break

      const raw = this.buffer.slice(0, index)
      this.buffer = this.buffer.slice(index + length)
      if (raw) this.#emit(raw)
    }
  }

  #emit(raw) {
    const data = parseEventBlock(raw)
    // 空 data 对聊天流没有意义，直接跳过
    if (data === null || data === '') return
    this.onEvent(data)
  }
}
