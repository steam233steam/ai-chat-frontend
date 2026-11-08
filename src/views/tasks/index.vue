<template>
  <div class="tasks-shell">
    <div v-if="isMobile && sidebarVisible" class="sidebar-mask" @click="sidebarVisible = false"></div>
    <ChatSidebar
      :sessions="sessions"
      :current-chat-id="null"
      :user-name="userName"
      :visible="sidebarVisible"
      @new-chat="goNewChat"
      @select="goSession"
      @rename="handleRename"
      @delete="handleDeleteSession"
      @open-tasks="sidebarVisible = false"
      @settings="router.push('/settings')"
      @logout="handleLogout"
    />
    <div class="tasks-container">
    <div class="tasks-header">
      <div class="tasks-heading">
        <el-button v-if="isMobile" class="back-btn menu-btn" aria-label="打开会话列表" @click="sidebarVisible = true">
          <el-icon><Menu /></el-icon>
        </el-button>
        <div class="title-block">
          <div class="title-row">
            <h2>任务闹钟</h2>
            <span class="tasks-count">{{ visibleTasks.length }}</span>
          </div>
          <p class="subtitle">到点自动执行：站内提醒、回调 webhook，或让 AI 去查一次数据</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" class="new-btn" @click="openCreate">
          <el-icon><Plus /></el-icon>
          新建任务
        </el-button>
        <el-button class="refresh-btn" :loading="loading" @click="loadTasks">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <div class="stats-row">
      <button
        v-for="stat in stats"
        :key="stat.key"
        type="button"
        :class="['stat-card', stat.tone, { active: stat.filter && statFilter === stat.filter }]"
        @click="applyStatFilter(stat)"
      >
        <span class="stat-value">{{ stat.value }}</span>
        <span class="stat-label">{{ stat.label }}</span>
      </button>
    </div>

    <div class="quick-create">
      <el-icon class="quick-icon"><Plus /></el-icon>
      <input
        ref="quickInput"
        v-model="createText"
        class="quick-input"
        maxlength="200"
        placeholder="一句话新建：明天九点提醒我交作业 / 每周一早上查北京天气"
        @keydown.enter.exact.prevent="handleCreate"
      />
      <el-button type="primary" :loading="creating" @click="handleCreate">解析</el-button>
    </div>

    <div class="tasks-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tasks-tab', { active: status === tab.value }]"
        type="button"
        role="tab"
        :aria-selected="status === tab.value"
        @click="switchStatus(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="tasks-search">
      <el-input v-model="keyword" clearable placeholder="搜任务标题，比如「作业」" />
    </div>

    <el-empty v-if="!loading && visibleTasks.length === 0" :description="keyword ? '没有匹配的任务' : emptyText" />

    <div v-else v-loading="loading" class="tasks-list">
      <section v-for="group in groups" :key="group.key" class="task-group">
        <div class="group-head">
          <span :class="['group-label', group.tone]">{{ group.label }}</span>
          <span class="group-count">{{ group.items.length }}</span>
        </div>
        <article v-for="task in group.items" :key="task.id" class="task-card">
        <div class="task-row">
          <div class="task-main">
            <div class="task-title-line">
              <span :class="['task-dot', task.status, { overdue: task.overdue }]"></span>
              <span class="task-title">{{ task.title }}</span>
            </div>
            <div class="task-meta">
              <span class="task-time">{{ formatTime(task.dueAt) }}</span>
              <span v-if="task.status === 'pending' && countdown(task.dueAt)" class="task-chip countdown">
                {{ countdown(task.dueAt) }}
              </span>
              <span class="task-chip">{{ recurrenceLabel(task.recurrence, task.recurrenceRule) }}</span>
              <span class="task-chip action">{{ actionLabel(task) }}</span>
              <span v-if="task.overdue" class="task-chip danger">已到期</span>
              <span v-if="task.status !== 'pending'" class="task-chip muted">{{ statusLabel(task.status) }}</span>
            </div>
          </div>
          <div class="task-actions">
            <el-button
              v-if="task.status === 'pending'"
              text
              size="small"
              :loading="actingId === task.id"
              @click="handleComplete(task)"
            >
              完成
            </el-button>
            <el-button text size="small" @click="toggleRuns(task)">
              {{ expandedId === task.id ? '收起记录' : '执行记录' }}
            </el-button>
            <el-button v-if="task.status === 'pending'" text size="small" @click="openEdit(task)">
              设置
            </el-button>
            <el-button text size="small" class="danger-text" @click="handleDelete(task)">删除</el-button>
          </div>
        </div>

        <div v-if="expandedId === task.id" class="task-runs">
          <div v-if="runsLoading" class="runs-loading">
            <el-icon class="is-spinning"><Loading /></el-icon>
            <span>加载执行记录…</span>
          </div>
          <div v-else-if="runs.length === 0" class="runs-empty">
            还没响过。到期后每分钟扫一次，响过会记在这里。
          </div>
          <ul v-else class="runs-list">
            <li v-for="run in runs" :key="run.id" class="run-item">
              <span :class="['run-status', run.status]">{{ run.status === 'success' ? '成功' : '失败' }}</span>
              <span class="run-time">{{ formatTime(run.startedAt) }}</span>
              <span class="run-action">{{ actionName(run.actionType) }}</span>
              <span class="run-detail">{{ run.detail }}</span>
            </li>
          </ul>
        </div>
        </article>
      </section>
    </div>

    <el-dialog v-model="editVisible" title="任务设置" width="420px" align-center>
      <div class="edit-field">
        <label>任务名称</label>
        <el-input v-model="editForm.title" maxlength="128" show-word-limit />
      </div>
      <div class="edit-field">
        <label>什么时候</label>
        <el-input v-model="editForm.dueAt" type="datetime-local" />
      </div>
      <div class="edit-field">
        <label>重复</label>
        <el-select v-model="editForm.recurrence" style="width: 100%">
          <el-option label="只一次" value="once" />
          <el-option label="每天" value="daily" />
          <el-option label="每周" value="weekly" />
        </el-select>
        <el-select
          v-if="editForm.recurrence === 'weekly'"
          v-model="editForm.weekday"
          style="width: 100%; margin-top: 8px"
          placeholder="选星期几"
        >
          <el-option v-for="day in weekdays" :key="day.value" :label="day.label" :value="day.value" />
        </el-select>
        <p class="field-hint">重复任务需要一个起始时间，到点后自动滚到下一次。</p>
      </div>
      <div class="edit-field">
        <label>到点做什么</label>
        <el-select v-model="editForm.actionType" style="width: 100%">
          <el-option label="站内提醒（默认）" value="notify" />
          <el-option label="调用 Webhook" value="webhook" />
          <el-option label="让 AI 查点东西（MCP 工具）" value="mcp" />
        </el-select>
      </div>
      <div v-if="editForm.actionType === 'webhook'" class="edit-field">
        <label>Webhook 地址</label>
        <el-input v-model="editForm.webhookUrl" placeholder="https://example.com/hook" />
        <p class="field-hint">到点会 POST 一条 JSON 到这个地址，5 秒超时，2xx 算成功。</p>
      </div>
      <div v-if="editForm.actionType === 'mcp'" class="edit-field">
        <label>查什么</label>
        <el-select v-model="editForm.mcpTool" style="width: 100%" placeholder="选一个工具">
          <el-option v-for="tool in mcpTools" :key="tool.name" :label="tool.label" :value="tool.name" />
        </el-select>
        <el-input
          v-if="editForm.mcpTool"
          v-model="editForm.mcpArg"
          style="margin-top: 8px"
          :placeholder="mcpArgPlaceholder"
        />
        <p class="field-hint">到点会调用这个工具，把结果写进执行记录并提醒你。</p>
      </div>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
    <TaskConfirmDialog
      v-model:visible="pendingDialog.visible"
      :data="pendingDialog.data"
      :pending-id="pendingDialog.id"
      :loading="pendingDialog.loading"
      @resolved="handlePendingResolved"
      @dismiss="pendingDialog.visible = false"
    />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Menu, Plus, Refresh } from '@element-plus/icons-vue'
import ChatSidebar from '@/components/ChatSidebar.vue'
import { getSessions, clearSession, updateTitle } from '@/api/chat'
import { getUserInfo, logout } from '@/api/user'
import { listTasks, listTaskRuns, updateTask, completeTask, deleteTask } from '@/api/task'
import { listMcpTools } from '@/api/mcp'
import { sendMessageStream } from '@/api/chat'
import { getPendingAction } from '@/api/user'
import { extractPendingId } from '@/utils/pending'
import TaskConfirmDialog from '@/components/TaskConfirmDialog.vue'

const router = useRouter()

const tabs = [
  { label: '待办', value: 'pending' },
  { label: '已完成', value: 'done' },
  { label: '已取消', value: 'cancelled' }
]

const isMobile = ref(false)
const sidebarVisible = ref(false)
const sessions = ref([])
const userName = ref('')

const updateIsMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) sidebarVisible.value = false
}

const loadSessions = async () => {
  try {
    const res = await getSessions()
    if (res.code === 200) sessions.value = res.data || []
  } catch (e) {
    console.error('加载会话列表失败', e)
  }
}

const goNewChat = () => {
  sidebarVisible.value = false
  router.push('/chat')
}

const goSession = (sessionId) => {
  sidebarVisible.value = false
  if (sessionId) router.push(`/chat/${sessionId}`)
}

const handleRename = ({ sessionId, title }) => {
  const session = sessions.value.find((s) => s.sessionId === sessionId)
  if (session) session.title = title
}

const handleDeleteSession = async (sessionId) => {
  try {
    await ElMessageBox.confirm('删除后该对话、消息和本会话记忆不可恢复，确定继续吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    await clearSession(sessionId)
    sessions.value = sessions.value.filter((s) => s.sessionId !== sessionId)
    ElMessage.success('对话已删除')
  } catch (e) {
    ElMessage.error(e?.message || '删除会话失败')
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await logout()
    localStorage.removeItem('token')
    localStorage.removeItem('loginUser')
    router.push('/login')
  } catch {
    // 用户取消
  }
}

const status = ref('pending')
const tasks = ref([])
const loading = ref(false)
const actingId = ref(null)
const expandedId = ref(null)
const runs = ref([])
const runsLoading = ref(false)

const editVisible = ref(false)
const saving = ref(false)
const editForm = ref({
  id: null,
  version: 0,
  title: '',
  dueAt: '',
  recurrence: 'once',
  weekday: 'MO',
  actionType: 'notify',
  webhookUrl: '',
  mcpTool: '',
  mcpArg: ''
})

const weekdays = [
  { value: 'MO', label: '周一' },
  { value: 'TU', label: '周二' },
  { value: 'WE', label: '周三' },
  { value: 'TH', label: '周四' },
  { value: 'FR', label: '周五' },
  { value: 'SA', label: '周六' },
  { value: 'SU', label: '周日' }
]
const WEEKDAY_LABELS = Object.fromEntries(weekdays.map((d) => [d.value, d.label]))

// 只读展示用：动作类型的中文名
const ACTION_NAMES = { notify: '站内提醒', webhook: 'Webhook', mcp: 'AI 查询' }
const actionName = (value) => ACTION_NAMES[value] || value || '-'

// 距到期还有多久：小于 1 天显示小时分钟，过期不显示（卡片已有“已到期”）
const countdown = (value) => {
  if (!value) return ''
  const diff = new Date(value).getTime() - Date.now()
  if (Number.isNaN(diff) || diff <= 0) return ''
  const minutes = Math.round(diff / 60000)
  if (minutes < 60) return `${minutes} 分钟后`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时后`
  return `${Math.floor(hours / 24)} 天后`
}

// 只放行信息查询类工具；key 是后端返回的公共工具名
const TOOL_LABELS = { weather: '天气', search: '搜索', now: '当前时间', fetch_url: '网页正文' }
const TOOL_ARG_KEYS = { weather: 'city', search: 'q', fetch_url: 'url', now: '' }
const TOOL_ARG_HINTS = { weather: '城市，如：北京', search: '搜索词，如：考研报名时间', fetch_url: '网页地址，如：https://example.com' }
const mcpToolsRaw = ref([])
const mcpTools = computed(() =>
  mcpToolsRaw.value
    .filter((t) => TOOL_LABELS[t.tool])
    .map((t) => ({ name: t.name, tool: t.tool, label: `${TOOL_LABELS[t.tool]}（${t.name}）` }))
)
const currentTool = computed(() => mcpTools.value.find((t) => t.name === editForm.value.mcpTool))
const mcpArgPlaceholder = computed(() => (currentTool.value ? TOOL_ARG_HINTS[currentTool.value.tool] || '可选参数' : '可选参数'))

const keyword = ref('')
const quickInput = ref(null)
const statFilter = ref('')
const creating = ref(false)
const createText = ref('')
const pendingDialog = ref({ visible: false, id: null, data: null, loading: false })

// 搜索只在已加载的 50 条里筛，够个人用；不做后端模糊查询
const visibleTasks = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return tasks.value
  return tasks.value.filter((t) => (t.title || '').includes(kw))
})
// 概览：已到期 / 今天 / 本周 / 待办总数
const startOfDay = (offset = 0) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d.getTime()
}
const pendingList = computed(() => (status.value === 'pending' ? tasks.value : []))
const stats = computed(() => {
  const now = Date.now()
  const todayEnd = startOfDay(1)
  const weekEnd = startOfDay(7)
  const list = pendingList.value
  return [
    { key: 'overdue', label: '已到期', tone: 'danger', value: list.filter((t) => t.dueAt && new Date(t.dueAt).getTime() <= now).length, filter: 'overdue' },
    { key: 'today', label: '今天', tone: 'warn', value: list.filter((t) => t.dueAt && new Date(t.dueAt).getTime() > now && new Date(t.dueAt).getTime() < todayEnd).length, filter: 'today' },
    { key: 'week', label: '本周', tone: 'normal', value: list.filter((t) => t.dueAt && new Date(t.dueAt).getTime() >= todayEnd && new Date(t.dueAt).getTime() < weekEnd).length, filter: 'week' },
    { key: 'all', label: '待办', tone: 'plain', value: list.length, filter: '' }
  ]
})

const applyStatFilter = (stat) => {
  statFilter.value = stat.filter
  if (status.value !== 'pending') status.value = 'pending'
}

// 按时间分组：已到期 / 今天 / 明天 / 本周 / 以后
const groups = computed(() => {
  const list = visibleTasks.value
  if (status.value !== 'pending') {
    return [{ key: 'all', label: status.value === 'done' ? '已完成' : '已取消', tone: 'plain', items: list }]
  }

  const now = Date.now()
  const todayEnd = startOfDay(1)
  const tomorrowEnd = startOfDay(2)
  const weekEnd = startOfDay(7)
  const buckets = {
    overdue: [], today: [], tomorrow: [], week: [], later: [], none: []
  }
  for (const t of list) {
    const ts = t.dueAt ? new Date(t.dueAt).getTime() : NaN
    if (Number.isNaN(ts)) { buckets.none.push(t); continue }
    if (ts <= now) buckets.overdue.push(t)
    else if (ts < todayEnd) buckets.today.push(t)
    else if (ts < tomorrowEnd) buckets.tomorrow.push(t)
    else if (ts < weekEnd) buckets.week.push(t)
    else buckets.later.push(t)
  }
  const defs = [
    { key: 'overdue', label: '已到期', tone: 'danger' },
    { key: 'today', label: '今天', tone: 'warn' },
    { key: 'tomorrow', label: '明天', tone: 'normal' },
    { key: 'week', label: '本周', tone: 'normal' },
    { key: 'later', label: '以后', tone: 'plain' },
    { key: 'none', label: '不限时间', tone: 'plain' }
  ]
  let out = defs
    .filter((d) => buckets[d.key].length)
    .map((d) => ({ ...d, items: buckets[d.key] }))

  if (statFilter.value === 'overdue') out = out.filter((g) => g.key === 'overdue')
  else if (statFilter.value === 'today') out = out.filter((g) => g.key === 'today')
  else if (statFilter.value === 'week') out = out.filter((g) => ['today', 'tomorrow', 'week'].includes(g.key))

  if (!out.length && list.length) return [{ key: 'all', label: '全部待办', tone: 'plain', items: list }]
  return out
})

const emptyText = computed(() => {
  if (status.value === 'pending') return '还没有待办任务。在聊天里说「明天九点提醒我交作业」就能建一条。'
  if (status.value === 'done') return '还没有完成的任务。'
  return '没有已取消的任务。'
})

const formatTime = (value) => {
  if (!value) return '不限时间'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const pad = (n) => String(n).padStart(2, '0')
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (sameDay) return `今天 ${hm}`
  if (isTomorrow) return `明天 ${hm}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
}

const recurrenceLabel = (recurrence, rule) => {
  if (recurrence === 'daily') return '每天'
  if (recurrence === 'weekly') {
    const day = /BYDAY=([A-Z]{2})/.exec(rule || '')
    return day ? `每${WEEKDAY_LABELS[day[1]] || '周'}` : '每周'
  }
  return '一次'
}

const statusLabel = (value) => (value === 'done' ? '已完成' : value === 'cancelled' ? '已取消' : value)

const actionLabel = (task) => {
  if (task.actionType === 'mcp') {
    const match = /"tool"\s*:\s*"([^"]+)"/.exec(task.actionConfig || '')
    if (!match) return 'MCP'
    const short = match[1].replace('mcp_info_', '').replace('mcp_notes_', '')
    return `MCP · ${TOOL_LABELS[short] || short}`
  }
  if (task.actionType === 'webhook') {
    const match = /"url"\s*:\s*"([^"]+)"/.exec(task.actionConfig || '')
    return match ? `Webhook · ${match[1].replace(/^https?:\/\//, '').slice(0, 28)}` : 'Webhook'
  }
  return '站内提醒'
}

const openCreate = () => {
  quickInput.value?.focus()
}

// 复用聊天那条意图管线：一句话 → 待确认 → 确认落库
const handleCreate = async () => {
  const text = createText.value.trim()
  if (!text) {
    ElMessage.warning('先写一句要做什么')
    return
  }
  creating.value = true
  let reply = ''
  try {
    const sessionId = `tasks-quick-${Date.now()}`
    await new Promise((resolve, reject) => {
      sendMessageStream(
        sessionId,
        text,
        (chunk) => { reply += chunk },
        resolve,
        reject,
        undefined,
        undefined
      )
    })
    const pendingId = extractPendingId(reply)
    if (pendingId == null) {
      ElMessage.warning('没解析出任务，换个说法试试，比如「明天九点提醒我交作业」')
      return
    }
    createText.value = ''
    pendingDialog.value = { visible: true, id: pendingId, data: null, loading: true }
    const res = await getPendingAction(pendingId)
    if (res.code === 200 && res.data) {
      pendingDialog.value.data = res.data
    } else {
      ElMessage.error('待确认内容已失效，请重新发起')
      pendingDialog.value.visible = false
    }
  } catch (e) {
    ElMessage.error(e?.message || '解析失败，稍后再试')
  } finally {
    creating.value = false
    pendingDialog.value.loading = false
  }
}

const handlePendingResolved = async (payload) => {
  pendingDialog.value.visible = false
  if (payload?.action === 'confirmed') {
    ElMessage.success('任务已创建')
    status.value = 'pending'
    await loadTasks()
  }
}

const loadTasks = async () => {
  loading.value = true
  try {
    const res = await listTasks(status.value, 50)
    tasks.value = res.data || []
  } catch (e) {
    ElMessage.error('任务加载失败')
  } finally {
    loading.value = false
  }
}

const switchStatus = (value) => {
  status.value = value
  expandedId.value = null
  loadTasks()
}

const toggleRuns = async (task) => {
  if (expandedId.value === task.id) {
    expandedId.value = null
    return
  }
  expandedId.value = task.id
  runs.value = []
  runsLoading.value = true
  try {
    const res = await listTaskRuns(task.id, 20)
    runs.value = res.data || []
  } catch (e) {
    ElMessage.error('执行记录加载失败')
  } finally {
    runsLoading.value = false
  }
}

const handleComplete = async (task) => {
  actingId.value = task.id
  try {
    await completeTask(task.id, task.version)
    ElMessage.success(task.recurrence === 'once' ? '已完成' : '已完成，已滚到下一次')
    await loadTasks()
  } catch (e) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    actingId.value = null
  }
}

const handleDelete = async (task) => {
  try {
    await ElMessageBox.confirm(`删除「${task.title}」？`, '删除任务', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (e) {
    return
  }
  try {
    await deleteTask(task.id)
    ElMessage.success('已删除')
    await loadTasks()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

const buildActionConfig = (form) => {
  if (form.actionType === 'webhook') {
    return JSON.stringify({ url: form.webhookUrl })
  }
  if (form.actionType === 'mcp') {
    const tool = mcpTools.value.find((t) => t.name === form.mcpTool)
    const key = tool ? TOOL_ARG_KEYS[tool.tool] : ''
    const args = key && form.mcpArg ? { [key]: form.mcpArg } : {}
    return JSON.stringify({ tool: form.mcpTool, args })
  }
  return null
}

const loadMcpTools = async () => {
  try {
    const res = await listMcpTools()
    mcpToolsRaw.value = res.data || []
  } catch (e) {
    mcpToolsRaw.value = []
  }
}

const readActionConfig = (task) => {
  if (task.actionType !== 'mcp') return { mcpTool: '', mcpArg: '' }
  try {
    const cfg = JSON.parse(task.actionConfig || '{}')
    const args = cfg.args || {}
    const key = Object.keys(args)[0]
    return { mcpTool: cfg.tool || '', mcpArg: key ? String(args[key]) : '' }
  } catch (e) {
    return { mcpTool: '', mcpArg: '' }
  }
}

const openEdit = (task) => {
  const match = /"url"\s*:\s*"([^"]+)"/.exec(task.actionConfig || '')
  editForm.value = {
    id: task.id,
    version: task.version,
    title: task.title,
    dueAt: task.dueAt || '',
    recurrence: task.recurrence || 'once',
    weekday: (/BYDAY=([A-Z]{2})/.exec(task.recurrenceRule || '') || [])[1] || 'MO',
    actionType: ['webhook', 'mcp'].includes(task.actionType) ? task.actionType : 'notify',
    webhookUrl: match ? match[1] : '',
    ...readActionConfig(task)
  }
  editVisible.value = true
}

const handleSave = async () => {
  const form = editForm.value
  if (form.actionType === 'webhook' && !/^https?:\/\//.test(form.webhookUrl)) {
    ElMessage.warning('Webhook 地址要以 http:// 或 https:// 开头')
    return
  }
  if (!form.dueAt && form.recurrence !== 'once') {
    ElMessage.warning('重复任务需要一个起始时间')
    return
  }
  if (form.recurrence === 'weekly' && !form.weekday) {
    ElMessage.warning('选一个每周的哪一天')
    return
  }
  if (form.actionType === 'mcp') {
    if (!form.mcpTool) {
      ElMessage.warning('先选一个要查询的工具')
      return
    }
    const tool = mcpTools.value.find((t) => t.name === form.mcpTool)
    if (tool && tool.tool === 'fetch_url' && !/^https?:\/\//.test(form.mcpArg || '')) {
      ElMessage.warning('网页地址要以 http:// 或 https:// 开头')
      return
    }
  }
  saving.value = true
  try {
    await updateTask(form.id, {
      version: form.version,
      title: form.title,
      dueAt: form.dueAt || null,
      recurrence: form.recurrence,
      recurrenceRule: form.recurrence === 'weekly' ? `BYDAY=${form.weekday}` : null,
      actionType: form.actionType,
      actionConfig: buildActionConfig(form)
    })
    ElMessage.success('已保存')
    editVisible.value = false
    await loadTasks()
  } catch (e) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
  loadTasks()
  loadMcpTools()
  loadSessions()
  try {
    const res = await getUserInfo()
    if (res?.code === 200) userName.value = res.data?.name || res.data?.phone || ''
  } catch {
    // 用户名拿不到不影响页面
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateIsMobile)
})
</script>

<style scoped>
.tasks-container {
  height: 100vh;
  overflow-y: auto;
  padding: 24px clamp(16px, 4vw, 48px) 48px;
  background: var(--bg-base);
}

.tasks-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.tasks-heading {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.title-row h2 {
  margin: 0;
  font-size: 22px;
  color: var(--text-primary);
}

.tasks-count {
  color: var(--text-tertiary);
  font-size: 13px;
}

.subtitle {
  margin: 4px 0 0;
  color: var(--text-tertiary);
  font-size: 13px;
}

.tasks-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tasks-tab {
  border: none;
  background: var(--bg-surface-soft);
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tasks-tab.active {
  background: var(--color-primary);
  color: #fff;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 14px 16px;
}

.task-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.task-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex: none;
}

.task-dot.overdue {
  background: #ef4444;
}

.task-dot.done {
  background: #22c55e;
}

.task-dot.cancelled {
  background: var(--text-tertiary);
}

.task-title {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.task-chip {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--bg-surface-soft);
}

.task-chip.action {
  color: var(--color-primary);
  background: rgba(99, 102, 241, 0.1);
}

.task-chip.danger {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.task-actions {
  display: flex;
  gap: 4px;
  flex: none;
}

.danger-text {
  color: #ef4444;
}

.task-runs {
  margin-top: 12px;
  border-top: 1px dashed var(--border-subtle);
  padding-top: 10px;
  font-size: 12px;
}

.runs-empty,
.runs-loading {
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.runs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.run-item {
  display: flex;
  gap: 10px;
  align-items: baseline;
  color: var(--text-secondary);
}

.run-status {
  flex: none;
  padding: 0 6px;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
}

.run-status.failed {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.run-time {
  color: var(--text-tertiary);
  flex: none;
}

.run-detail {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-field {
  margin-bottom: 14px;
}

.edit-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tasks-search {
  margin-bottom: 12px;
}

.create-hint {
  margin: 0 0 10px;
  color: var(--text-secondary, #666);
  font-size: 13px;
}

@media (max-width: 640px) {
  .tasks-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .tasks-heading {
    justify-content: space-between;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .el-button {
    flex: 1;
    margin-left: 0;
  }
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft, #e5e7eb);
  border-radius: 12px;
  background: var(--bg-surface, #fff);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.stat-card:hover {
  border-color: var(--color-primary-soft, #a5b4fc);
}

.stat-card.active {
  border-color: var(--color-primary, #6366f1);
  box-shadow: 0 0 0 1px var(--color-primary, #6366f1);
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #111827);
  line-height: 1.1;
}

.stat-label {
  font-size: 12px;
  color: var(--text-tertiary, #6b7280);
}

.stat-card.danger .stat-value { color: #dc2626; }
.stat-card.warn .stat-value { color: #d97706; }

.quick-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 8px 12px;
  margin-bottom: 12px;
  border: 1px solid var(--border-strong, #d1d5db);
  border-radius: 12px;
  background: var(--bg-surface, #fff);
}

.quick-create:focus-within {
  border-color: var(--color-primary, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.quick-icon {
  color: var(--text-tertiary, #6b7280);
}

.quick-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-primary, #111827);
}

.quick-input::placeholder {
  color: var(--text-tertiary, #9ca3af);
}

.task-group + .task-group {
  margin-top: 18px;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-secondary, #4b5563);
}

.group-label {
  font-weight: 600;
}

.group-label.danger { color: #dc2626; }
.group-label.warn { color: #d97706; }

.group-count {
  padding: 0 7px;
  border-radius: 999px;
  background: var(--bg-hover, #f3f4f6);
  font-size: 12px;
  color: var(--text-tertiary, #6b7280);
}

@media (max-width: 640px) {
  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.tasks-shell {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--bg-base);
}

.tasks-shell .tasks-container {
  flex: 1;
  min-width: 0;
  height: 100%;
}

.sidebar-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
}

.menu-btn {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  /* 移动端所有状态共用同一套卡片格式：标题/元信息在上，操作按钮整行平分在下 */
  .task-card {
    padding: 12px 12px 6px;
  }

  .task-row {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .task-meta {
    gap: 6px;
    margin-top: 6px;
  }

  .task-actions {
    width: 100%;
    gap: 0;
    padding-top: 4px;
    border-top: 1px solid var(--border-subtle);
  }

  .task-actions :deep(.el-button) {
    flex: 1;
    margin: 0;
    padding: 6px 0;
    font-size: 12.5px;
  }

  .task-title {
    font-size: 14.5px;
  }

  .tasks-shell .tasks-container {
    padding: 16px 14px 40px;
  }

  .tasks-heading {
    gap: 10px;
  }

  .title-row h2 {
    font-size: 19px;
  }

  .subtitle {
    font-size: 12px;
  }
}
</style>
