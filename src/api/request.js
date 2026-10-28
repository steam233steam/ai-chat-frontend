import { ElMessage } from 'element-plus'
import axios from 'axios'
import router from '@/router'

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 60000,  // 增加到60秒，AI响应可能较慢
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 自动添加 Token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = token
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

const handleAuthExpired = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('loginUser')
  router.push('/login')
}

const createBusinessError = (code, message) => {
  const error = new Error(message)
  error.code = code
  error.business = true
  return error
}

// 响应拦截器
api.interceptors.response.use(
  response => {
    const res = response.data

    // 兼容无 code 的接口
    if (res === undefined || res === null || typeof res !== 'object' || !('code' in res)) {
      return res
    }

    if (res.code === 200) {
      return res
    }

    if (res.code === 401) {
      handleAuthExpired()
      ElMessage.error(res.message || '登录已过期，请重新登录')
      return Promise.reject(createBusinessError(401, res.message || '未登录'))
    }

    // 400/500 等业务错误交给调用方展示，避免重复弹窗
    return Promise.reject(createBusinessError(res.code, res.message || '请求失败'))
  },
  error => {
    let message = '请求失败'
    let code = 500

    if (error.code === 'ERR_NETWORK') {
      code = 'ERR_NETWORK'
      message = '网络连接失败，请检查网络后重试'
    } else if (error.code === 'ECONNABORTED') {
      code = 'ECONNABORTED'
      message = '请求超时，请稍后重试'
    } else if (error.response) {
      const status = error.response.status
      code = status
      message = error.response.data?.message || '请求失败'

      switch (status) {
        case 401:
          message = message || '登录已过期，请重新登录'
          handleAuthExpired()
          break
        case 403:
          message = message || '没有权限访问'
          break
        case 404:
          message = message || '请求的资源不存在'
          break
        case 409:
          message = message || '会话模型冲突，请新建会话'
          break
        case 500:
          message = message || '服务器错误，请稍后重试'
          break
        default:
          message = message || `请求失败（${status}）`
      }
    } else if (error.request) {
      code = 'ERR_NETWORK'
      message = '网络连接失败，请检查网络后重试'
    }

    // 不再在此统一弹窗，让页面根据自己的场景展示 400/500 等业务错误
    const businessError = createBusinessError(code, message)
    return Promise.reject(businessError)
  }
)

export default api
