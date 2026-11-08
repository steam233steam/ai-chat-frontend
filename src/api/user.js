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
 * 手机号 + 密码注册（不需要短信验证码）
 * @param {string} phone - 手机号
 * @param {string} password - 密码
 */
export const register = (phone, password) => {
  return api.post('/user/register', { phone, password })
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
 * 检查是否新用户
 */
export const isNewUser = () => {
  return api.get('/user/is-new-user')
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

// ==================== MindButler P1 ====================

// ---------- 用户任务 /user/tasks ----------

/** 到期待办（status=pending、有 dueAt 且已到期，按 dueAt 升序） */
export const getDueTasks = (limit = 50) => {
  return api.get('/user/tasks/due', { params: { limit } })
}

/** 任务列表（游标分页） */
export const getTasks = (status = 'pending', beforeId, limit = 50) => {
  const params = { status, limit }
  if (beforeId) params.beforeId = beforeId
  return api.get('/user/tasks', { params })
}

/** 查单条任务 */
export const getTask = (id) => {
  return api.get(`/user/tasks/${id}`)
}

/** 手动创建任务（不走 LLM） */
export const createTask = (request) => {
  return api.post('/user/tasks', request)
}

/** 更新任务（乐观锁） */
export const updateTask = (id, request) => {
  return api.put(`/user/tasks/${id}`, request)
}

/** 完成任务（once→done；daily/weekly 滚动到下次） */
export const completeTask = (id, version) => {
  return api.post(`/user/tasks/${id}/complete`, { version })
}

/** 删除任务（软删） */
export const deleteTask = (id) => {
  return api.delete(`/user/tasks/${id}`)
}

// ---------- 用户记忆 /user/memories ----------

/** 查询生效记忆（active 且未过期）
 * 传 sessionId 时只返回「全局 + 当前会话」的记忆（P1.3 会话隔离）；不传则全量。 */
export const getMemories = (limit = 100, sessionId) => {
  const params = { limit }
  if (sessionId) params.sessionId = sessionId
  return api.get('/user/memories', { params })
}

/** 导出全部记忆（含 superseded） */
export const exportMemories = () => {
  return api.get('/user/memories/export')
}

/** 查单条记忆 */
export const getMemory = (id) => {
  return api.get(`/user/memories/${id}`)
}

/** 手动创建记忆 */
export const createMemory = (request) => {
  return api.post('/user/memories', request)
}

/** 更新记忆（乐观锁） */
export const updateMemory = (id, request) => {
  return api.put(`/user/memories/${id}`, request)
}

/** 删除记忆（软删） */
export const deleteMemory = (id) => {
  return api.delete(`/user/memories/${id}`)
}

// ---------- 待确认动作 /user/pending-actions ----------

/** 当前会话的待确认动作（data 可能为 null） */
export const getCurrentPendingAction = (sessionId) => {
  return api.get('/user/pending-actions/current', { params: { sessionId } })
}

/** 按 id 查单条待确认动作（前端拿到 [[MB:pending=N]] 里的 id 后调用） */
export const getPendingAction = (id) => {
  return api.get(`/user/pending-actions/${id}`)
}

/** 确认待确认动作 */
export const confirmPendingAction = (id) => {
  return api.post(`/user/pending-actions/${id}/confirm`)
}

/** 拒绝待确认动作 */
export const rejectPendingAction = (id) => {
  return api.post(`/user/pending-actions/${id}/reject`)
}
