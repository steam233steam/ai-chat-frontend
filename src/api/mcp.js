import request from './request'

export const listMcpTools = () => request.get('/mcp/tools')
