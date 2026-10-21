import api from './request'

/**
 * 发送验证码
 * @param {string} phone - 手机号
 */
export const sendVerificationCode = (phone) => {
  return api.post('/user/code', null, {
    params: { phone }
  })
}

/**
 * 验证码登录
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 */
export const loginWithCode = (phone, code) => {
  return api.post('/user/login', { phone, code })
}

/**
 * 密码登录
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 */
export const loginWithPassword = (phone, password) => {
  return api.post('/user/login/password', { phone, password })
}

/**
 * 设置密码（首次登录后）
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @param {string} password - 新密码
 */
export const setPassword = (phone, code, password) => {
  return api.put('/user/set-password', { phone, code, password })
}

/**
 * 获取当前用户信息
 */
export const getUserInfo = () => {
  return api.get('/user/me')
}

/**
 * 修改用户资料
 * @param {string} name - 昵称
 */
export const updateProfile = (name) => {
  return api.put('/user/profile', { name })
}

/**
 * 登出
 */
export const logout = () => {
  return api.post('/user/logout')
}
