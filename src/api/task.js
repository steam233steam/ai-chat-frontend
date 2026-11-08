import api from './request'

/** 任务列表：status = pending | done | cancelled */
export const listTasks = (status = 'pending', limit = 50) => {
  return api.get('/user/tasks', { params: { status, limit } })
}

/** 单条任务 */
export const getTask = (id) => api.get(`/user/tasks/${id}`)

/** 任务的执行记录（闹钟响过几次、成功与否） */
export const listTaskRuns = (id, limit = 20) => {
  return api.get(`/user/tasks/${id}/runs`, { params: { limit } })
}

/** 更新任务（乐观锁，必须带 version） */
export const updateTask = (id, payload) => api.put(`/user/tasks/${id}`, payload)

/** 完成任务（recurring 会滚到下一次） */
export const completeTask = (id, version) => {
  return api.post(`/user/tasks/${id}/complete`, { version })
}

/** 删除任务（软删） */
export const deleteTask = (id) => api.delete(`/user/tasks/${id}`)
