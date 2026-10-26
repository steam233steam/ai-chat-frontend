import api from './request'
import router from '@/router'
import { SSEParser } from '@/utils/sse'

// 获取可用模型列表（公开接口）
// 返回模型名数组，如 ["qwen2.5-coder:7b", "deepseek-chat"]
export const getModels = async () => {
  const res = await api.get('/chat/models')
  return res.code === 200 ? (res.data || []) : []
}

// 发送消息（同步）
export const sendMessage = (sessionId, question, modelName) => {
  const params = { sessionid: sessionId, question }
  if (modelName) params.modelName = modelName
  return api.post('/chat/ask', null, { params })
}

// 发送消息（流式）
// onChunk(chunk)    —— 每收到一个数据片段就回调
// onComplete()      —— 流正常结束
// onError(err)      —— 出错（用户主动取消不会触发）
// signal            —— AbortSignal，用于取消请求
// modelName         —— 可选，模型名（白名单内），不传用默认模型
export const sendMessageStream = async (sessionId, question, onChunk, onComplete, onError, signal, modelName) => {
  const token = localStorage.getItem('token')
  let url = `/api/chat/ask-stream?sessionid=${encodeURIComponent(sessionId)}&question=${encodeURIComponent(question)}`
  if (modelName) {
    url += `&modelName=${encodeURIComponent(modelName)}`
  }

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

// 获取历史消息（支持分页）
// limit: 每页条数（1-100），不传返回全量；beforeId: 游标（该 ID 之前的一页），需配合 limit
export const getHistory = (sessionId, options = {}) => {
  const params = { sessionid: sessionId }
  if (options.limit) params.limit = options.limit
  if (options.beforeId) params.beforeId = options.beforeId
  return api.get('/chat/history', { params })
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
