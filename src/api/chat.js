import api from './request'
import router from '@/router'
import { SSEParser } from '@/utils/sse'

// 发送消息（同步）
export const sendMessage = (sessionId, question) => {
  return api.post('/chat/ask', null, {
    params: { sessionid: sessionId, question: question }
  })
}

// 发送消息（流式）
// onChunk(chunk)    —— 每收到一个数据片段就回调
// onComplete()      —— 流正常结束
// onError(err)      —— 出错（用户主动取消不会触发）
// signal            —— AbortSignal，用于取消请求
export const sendMessageStream = async (sessionId, question, onChunk, onComplete, onError, signal) => {
  const token = localStorage.getItem('token')
  const url = `/api/chat/ask-stream?sessionid=${encodeURIComponent(sessionId)}&question=${encodeURIComponent(question)}`

  let response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...(token ? { 'Authorization': token } : {}),
      },
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') return
    if (onError) onError(err)
    return
  }

  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('loginUser')
    router.push('/login')
    if (onError) onError(new Error('登录已过期，请重新登录'))
    return
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`
    if (response.status === 400) {
      message = '请求参数错误，请稍后重试'
    } else if (response.status === 500) {
      message = 'AI 服务暂时不可用，请稍后重试'
    }
    if (onError) onError(new Error(message))
    return
  }

  if (!response.body) {
    if (onError) onError(new Error('当前浏览器不支持流式响应'))
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let completed = false

  const done = () => {
    if (completed) return
    completed = true
    if (onComplete) onComplete()
  }

  // 解析逻辑抽到 utils/sse.js，保留 chunk 的前导空格并兼容 CRLF
  const parser = new SSEParser((data) => {
    if (data === '[DONE]') {
      parser.stop()
      done()
      return
    }
    if (onChunk) onChunk(data)
  })

  try {
    while (!completed) {
      const { done: streamDone, value } = await reader.read()
      if (streamDone) break
      parser.feed(decoder.decode(value, { stream: true }))
    }

    if (!completed) {
      parser.feed(decoder.decode())
      parser.flush()
      done()
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // 用户主动取消，不当作错误
      return
    }
    if (onError) onError(err)
  } finally {
    try {
      reader.releaseLock()
    } catch (_) {
      // ignore
    }
  }
}

// 获取会话列表
export const getSessions = () => {
  return api.get('/chat/sessions')
}

// 获取历史消息
export const getHistory = (sessionId) => {
  return api.get('/chat/history', {
    params: { sessionid: sessionId }
  })
}

// 更新会话标题
export const updateTitle = (sessionId, title) => {
  return api.put('/chat/title', null, {
    params: { sessionid: sessionId, title: title }
  })
}

// 清空/删除会话
export const clearSession = (sessionId) => {
  return api.delete('/chat/clear-session', {
    params: { sessionid: sessionId }
  })
}
