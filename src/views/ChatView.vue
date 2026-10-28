<template>
  <div class="chat-container">
    <div class="decor-blob decor-1"></div>
    <div class="decor-blob decor-2"></div>
    <!-- 侧边栏遮罩（移动端） -->
    <div v-if="isMobile && sidebarVisible" class="sidebar-mask" @click="closeSidebar"></div>

    <ChatSidebar
      :sessions="chatSessions"
      :current-chat-id="currentChatId"
      :user-name="userInfo?.name || ''"
      :visible="sidebarVisible"
      @new-chat="newChat"
      @select="selectChat"
      @rename="handleRename"
      @delete="deleteChat"
      @settings="router.push('/settings')"
      @logout="handleLogout"
    />

    <!-- 主内容区 -->
    <main class="chat-main">
      <!-- 顶部导航 -->
      <header class="chat-header">
        <el-button class="menu-btn" @click="toggleSidebar" circle>
          <el-icon><Menu /></el-icon>
        </el-button>
        <div class="header-title-wrap">
          <div class="header-title">
            {{ currentSession?.title || '新对话' }}
          </div>
          <span v-if="currentSession?.model" class="header-model-tag" :title="'锁定模型：' + currentSession.model">
            {{ currentSession.model }}
          </span>
        </div>
        <div class="header-actions">
          <!-- 删除当前对话按钮（仅移动端显示） -->
          <el-button v-if="isMobile" size="small" circle class="header-action mobile-delete-btn" @click="deleteChat(currentChatId)" title="删除当前对话">
            <el-icon><Delete /></el-icon>
          </el-button>
          <!-- 主题切换 -->
          <el-button size="small" circle class="header-action" :title="isDark ? '切换为浅色' : '切换为深色'" @click="toggle">
            <el-icon><Sunny v-if="isDark" /><Moon v-else /></el-icon>
          </el-button>
          <!-- 历史 / 设置入口 -->
          <el-button size="small" circle class="header-action desktop-action" title="历史记录" @click="router.push('/history')">
            <el-icon><Clock /></el-icon>
          </el-button>
          <el-button size="small" circle class="header-action desktop-action" title="设置" @click="router.push('/settings')">
            <el-icon><Setting /></el-icon>
          </el-button>
          <!-- 导出按钮 -->
          <el-dropdown class="desktop-action" @command="(format) => exportChat(format)">
            <el-button size="small" circle class="header-action" title="导出对话">
              <el-icon><Download /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="json">导出为 JSON</el-dropdown-item>
                <el-dropdown-item command="text">导出为文本</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <!-- 登出按钮 -->
          <el-button size="small" circle class="header-action desktop-action" @click="handleLogout" title="登出">
            <el-icon><SwitchButton /></el-icon>
          </el-button>
          <!-- 移动端更多菜单 -->
          <el-dropdown class="mobile-action" @command="handleMobileCommand">
            <el-button size="small" circle class="header-action" title="更多">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="history">历史记录</el-dropdown-item>
                <el-dropdown-item command="settings">设置</el-dropdown-item>
                <el-dropdown-item command="export-json">导出 JSON</el-dropdown-item>
                <el-dropdown-item command="export-text">导出文本</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 消息区域 -->
      <div class="chat-messages" ref="messageContainer">
        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-state">
          <el-icon class="loading-icon" :size="40"><Loading /></el-icon>
          <p>正在加载对话...</p>
        </div>

        <!-- 空状态 -->
        <WelcomeScreen
          v-else-if="messages.length === 0"
          :questions="quickQuestions"
          @select="sendQuickQuestion"
        />

        <!-- 消息列表 -->
        <AnimatePresence v-else>
          <div class="messages-stack">
            <!-- 加载更早历史提示（滚到顶部触发） -->
            <div v-if="isLoadingOlder" class="load-older-tip">
              <el-icon class="loading-icon" :size="18"><Loading /></el-icon>
              <span>加载更早的消息...</span>
            </div>
            <ChatMessage
              v-for="msg in messages"
              :key="msg.id"
              :message="msg"
              @copy="copyMessage"
            />
          </div>
        </AnimatePresence>
      </div>

      <!-- 滚回底部按钮 -->
      <transition name="fade-slide">
        <button v-if="showScrollBottom" class="scroll-bottom-btn" @click="scrollToBottom">
          <el-icon><ArrowDown /></el-icon>
        </button>
      </transition>

      <!-- 输入区域 -->
      <ChatComposer
        v-model="inputMessage"
        v-model:selected-model="selectedModel"
        :model-options="modelOptions"
        :model-locked="modelLocked"
        :is-typing="isTyping"
        @send="handleSend"
        @stop="stopGeneration"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Menu, Delete, ArrowDown, SwitchButton, Download, Loading,
  Clock, Setting, MoreFilled
} from '@element-plus/icons-vue'
import { sendMessageStream, getSessions, getHistory, clearSession, getModels } from '@/api/chat'
import { getUserInfo, logout } from '@/api/user'
import { enhanceCodeBlocks, exportChatAsJSON, exportChatAsText, copyText } from '@/utils/markdown'
import ChatMessage from '@/components/ChatMessage.vue'
import ChatSidebar from '@/components/ChatSidebar.vue'
import ChatComposer from '@/components/ChatComposer.vue'
import WelcomeScreen from '@/components/WelcomeScreen.vue'
import { useTheme } from '@/composables/useTheme'
import { AnimatePresence } from 'motion-v'
import { Moon, Sunny } from '@element-plus/icons-vue'

const router = useRouter()
const inputMessage = ref('')
const { isDark, toggle } = useTheme()
const messages = ref([])
const isTyping = ref(false)
const messageContainer = ref(null)
const currentChatId = ref(null)
const chatSessions = ref([])
const sidebarVisible = ref(false)
const isLoading = ref(false)
const abortController = ref(null)
let streamRAF = null
let msgIdCounter = 0
// 指向当前正在流式输出的 AI 消息，停止生成时需要把它切成 Markdown
let activeAiMsg = null
const windowWidth = ref(window.innerWidth)
const showScrollBottom = ref(false)
const isNearBottom = ref(true)
const userInfo = ref(null)

// 模型选择
const modelOptions = ref([])
const selectedModel = ref('')
// 会话锁模型：当前会话已锁定的模型（null 表示未锁定/新会话）
const currentSessionModel = ref(null)
const modelLocked = computed(() => !!currentSessionModel.value)

const quickQuestions = ref([
  '帮我写一段 Python 代码',
  '解释一下什么是人工智能',
  '翻译这句话成英文',
  '总结一下这篇文档的内容'
])

const currentSession = computed(() => {
  return chatSessions.value.find(s => s.sessionId === currentChatId.value)
})

const isMobile = computed(() => windowWidth.value <= 768)

const onResize = () => {
  windowWidth.value = window.innerWidth
}

const onScroll = () => {
  if (!messageContainer.value) return
  const el = messageContainer.value
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight
  isNearBottom.value = distance < 80
  showScrollBottom.value = distance > 200
  // 滚动到顶部时加载更早一页历史
  if (el.scrollTop < 10) {
    loadOlderMessages()
  }
}

// 中断当前流式请求
const abortActiveStream = () => {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
  isTyping.value = false
  if (streamRAF) {
    cancelAnimationFrame(streamRAF)
    streamRAF = null
  }
}

onMounted(async () => {
  // 加载用户信息
  try {
    const res = await getUserInfo()
    if (res.code === 200) {
      userInfo.value = res.data
    }
  } catch (error) {
    console.error('加载用户信息失败', error)
  }

  await loadModels()
  await loadChatId()
  await loadSessions()
  await loadMessages()

  window.addEventListener('resize', onResize)
  if (messageContainer.value) {
    messageContainer.value.addEventListener('scroll', onScroll)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (messageContainer.value) {
    messageContainer.value.removeEventListener('scroll', onScroll)
  }
  abortActiveStream()
})

const loadModels = async () => {
  try {
    modelOptions.value = await getModels()
  } catch (e) {
    console.error('加载模型列表失败', e)
    modelOptions.value = []
  }
}

const loadChatId = async () => {
  const id = router.currentRoute.value.params.id
  if (id) {
    currentChatId.value = id
    return
  }

  currentChatId.value = generateSessionId()
  // 把临时会话 ID 写进地址栏，刷新后还能回到同一个会话
  await router.replace(`/chat/${currentChatId.value}`).catch(() => {})
}

const generateSessionId = () => {
  const raw = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
  return raw.slice(0, 64)
}

// 历史消息分页：每页条数
const HISTORY_PAGE_SIZE = 30
const hasMoreHistory = ref(false)
const oldestServerId = ref(null)
const isLoadingOlder = ref(false)

// 浏览器前进/后退时路由参数会变，但组件实例被复用，需要手动同步会话
watch(
  () => router.currentRoute.value.params.id,
  async (id) => {
    if (!id || id === currentChatId.value) return
    abortActiveStream()
    activeAiMsg = null
    currentChatId.value = id
    messages.value = []
    syncSessionModel(id)
    await loadMessages()
  }
)

// 流式结束时前端只知道用户选择的模型；默认模型由后端解析，刷新会话后补到最新 AI 气泡
const syncLastAiModel = () => {
  if (!currentSessionModel.value) return
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === 'ai') {
      if (!messages.value[i].model) messages.value[i].model = currentSessionModel.value
      break
    }
  }
}

const loadSessions = async () => {
  try {
    const res = await getSessions()
    if (res.code === 200) {
      chatSessions.value = res.data || []
      // 会话列表刷新后，同步当前会话锁定的模型（可能新会话刚锁定模型）
      if (currentChatId.value) {
        syncSessionModel(currentChatId.value)
        syncLastAiModel()
      }
    }
  } catch (e) {
    console.error('加载会话列表失败', e)
    chatSessions.value = []
  }
}

// 把一条历史接口返回项归一化成消息对象（兼容字符串数组与 v5/v6 对象结构）
const toMessage = (item) => {
  const normalized = typeof item === 'string'
    ? { role: 'user', content: item, timestamp: null }
    : item
  if (!normalized || normalized.role === 'system') return null
  const content = normalized.content ?? ''
  const isAi = normalized.role !== 'user'
  const msg = {
    role: isAi ? 'ai' : 'user',
    content,
    // 历史消息没带 model 时用会话锁定模型兜底（旧数据 / 精简接口）
    model: isAi ? (normalized.model || currentSessionModel.value || null) : null,
    streaming: false,
    timestamp: normalized.timestamp ? new Date(normalized.timestamp) : new Date()
  }
  // 服务端消息带自增 id，用它做渲染 key；本地/旧数据没有则用本地计数器
  msg.id = typeof normalized.id === 'number' ? normalized.id : ++msgIdCounter
  return msg
}

// 加载最新一页历史（用于切换会话 / 首次进入）
const loadMessages = async () => {
  const sessionId = currentChatId.value
  if (!sessionId) return

  isLoading.value = true
  // 切换会话后先清掉上一页的分页游标，避免旧游标参与新会话的加载
  hasMoreHistory.value = false
  oldestServerId.value = null

  try {
    const res = await getHistory(sessionId, { limit: HISTORY_PAGE_SIZE })
    // 请求期间用户可能已切到别的会话，旧响应直接丢弃
    if (sessionId !== currentChatId.value) return
    const items = res.code === 200 && res.data ? res.data : []
    messages.value = items.map(toMessage).filter(Boolean)
    msgIdCounter = messages.value.length
    // 会话列表偶尔拿不到 model（旧缓存/跨标签页）时，用历史里最近一条消息的模型兜底
    const historyModel = [...items].reverse().find(i => i && i.model)?.model
    if (historyModel && !currentSessionModel.value) {
      currentSessionModel.value = historyModel
      selectedModel.value = historyModel
    }
    syncLastAiModel()
    const ids = items.filter((i) => i && typeof i.id === 'number').map((i) => i.id)
    // 正好一页 => 可能还有更早的数据；不足一页 => 没有更多
    hasMoreHistory.value = ids.length === HISTORY_PAGE_SIZE
    oldestServerId.value = ids.length ? Math.min(...ids) : null
  } catch (e) {
    if (sessionId !== currentChatId.value) return
    console.error('加载消息失败', e)
    messages.value = []
    hasMoreHistory.value = false
    oldestServerId.value = null
  } finally {
    if (sessionId === currentChatId.value) isLoading.value = false
  }

  if (sessionId !== currentChatId.value) return

  // 等列表真正渲染出来后再挂载代码块复制按钮并滚到底部
  await nextTick()
  enhanceCodeBlocks(messageContainer.value)
  await scrollToBottom()
}

// 加载更早的一页（滚动到顶部时触发），把旧消息 prepend 到列表顶部
const loadOlderMessages = async () => {
  const sessionId = currentChatId.value
  if (!sessionId || isLoading.value || isLoadingOlder.value || !hasMoreHistory.value || !oldestServerId.value) return

  isLoadingOlder.value = true
  const beforeId = oldestServerId.value
  const container = messageContainer.value
  const prevScrollHeight = container ? container.scrollHeight : 0
  const prevScrollTop = container ? container.scrollTop : 0

  try {
    const res = await getHistory(sessionId, {
      limit: HISTORY_PAGE_SIZE,
      beforeId
    })
    // 请求期间切换了会话：不要把旧会话的历史插到新会话里
    if (sessionId !== currentChatId.value) return
    const items = res.code === 200 && res.data ? res.data : []
    if (items.length > 0) {
      const older = items.map(toMessage).filter(Boolean)
      messages.value = [...older, ...messages.value]
      const ids = items.filter((i) => i && typeof i.id === 'number').map((i) => i.id)
      oldestServerId.value = ids.length ? Math.min(...ids) : null
      hasMoreHistory.value = ids.length === HISTORY_PAGE_SIZE
      // 恢复滚动位置，让当前视图锚定在加载前的位置
      await nextTick()
      if (container) {
        container.scrollTop = prevScrollTop + (container.scrollHeight - prevScrollHeight)
      }
      enhanceCodeBlocks(container)
    } else {
      hasMoreHistory.value = false
      oldestServerId.value = null
    }
  } catch (e) {
    if (sessionId === currentChatId.value) {
      console.error('加载更早消息失败', e)
    }
  } finally {
    isLoadingOlder.value = false
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    isNearBottom.value = true
    showScrollBottom.value = false
  }
}

// 智能滚动：只在用户已接近底部时才自动滚
const smartScroll = async () => {
  if (!isNearBottom.value) return
  await nextTick()
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}

// 把流式输出的纯文本气泡切成 Markdown
const finalizeStreamingMessage = () => {
  const msg = activeAiMsg
  activeAiMsg = null
  if (!msg || !msg.streaming) return
  msg.streaming = false
  nextTick(() => enhanceCodeBlocks(messageContainer.value))
}

const stopGeneration = () => {
  abortActiveStream()
  finalizeStreamingMessage()
  // 后端在取消时也会保存已生成的部分，重新拉一次列表同步标题
  loadSessions()
}

const resetStreamingState = () => {
  activeAiMsg = null
  isTyping.value = false
  abortController.value = null
  if (streamRAF) {
    cancelAnimationFrame(streamRAF)
    streamRAF = null
  }
}

const handleStreamError = (error, aiMsg, userMsgObj, originalText) => {
  console.error('流式发送失败', error)
  resetStreamingState()

  if (error?.code === 409) {
    // 会话锁冲突在落库前抛出，用户消息并未保存：回滚两个气泡并把内容放回输入框
    // 注意：响应式数组里取到的是 Proxy，不能用原始对象引用比较，按 id 过滤
    const rejectedIds = new Set([aiMsg.id, userMsgObj.id])
    messages.value = messages.value.filter(m => !rejectedIds.has(m.id))
    if (!inputMessage.value.trim()) inputMessage.value = originalText
    // 本地会话列表可能已过期（例如另一个标签页锁定了模型），刷新后再同步锁定态
    loadSessions()
    ElMessage.warning(error.message || '该会话已锁定模型，要切换请新建会话')
    return
  }

  // 其他错误（网络中断 / AI 500）后端可能已保存用户消息，保留用户气泡便于继续
  messages.value = messages.value.filter(m => m.id !== aiMsg.id)
  if (error?.message) {
    ElMessage.error(error.message)
  } else {
    ElMessage.error('发送失败，请稍后重试')
  }
}

const handleSend = async () => {
  const trimmedInput = inputMessage.value.trim()
  if (!trimmedInput || isTyping.value) return

  if (trimmedInput.length > 8000) {
    ElMessage.warning('消息不能超过 8000 个字符')
    return
  }

  const userMsg = trimmedInput
  const userMsgObj = {
    id: `local_${Date.now()}_${++msgIdCounter}`,
    role: 'user',
    content: userMsg,
    timestamp: new Date()
  }
  messages.value.push(userMsgObj)

  inputMessage.value = ''
  isTyping.value = true
  await scrollToBottom()

  // 创建一个临时的 AI 消息用于流式更新
  const aiMsg = reactive({
    id: `local_${Date.now()}_${++msgIdCounter}`,
    role: 'ai',
    content: '',
    model: selectedModel.value || currentSessionModel.value || null,
    streaming: true,
    timestamp: new Date()
  })
  messages.value.push(aiMsg)
  activeAiMsg = aiMsg
  await scrollToBottom()

  // 跟踪是否收到第一块数据
  let hasReceivedData = false

  // 创建 AbortController，支持取消
  abortController.value = new AbortController()

  try {
    // 使用流式接口
    await sendMessageStream(
      currentChatId.value,
      userMsg,
      (chunk) => {
        hasReceivedData = true
        aiMsg.content += chunk
        if (!streamRAF) {
          streamRAF = requestAnimationFrame(() => {
            streamRAF = null
            smartScroll()
          })
        }
      },
      () => {
        aiMsg.streaming = false
        resetStreamingState()
        if (!hasReceivedData) {
          // 一个片段都没收到时不要留空白气泡
          messages.value = messages.value.filter(m => m.id !== aiMsg.id)
          ElMessage.warning('未收到 AI 回复，请稍后重试')
          return
        }
        nextTick(() => enhanceCodeBlocks(messageContainer.value))
        loadSessions()
      },
      (error) => handleStreamError(error, aiMsg, userMsgObj, userMsg),
      abortController.value.signal,
      selectedModel.value || undefined
    )
  } catch (e) {
    handleStreamError(e, aiMsg, userMsgObj, userMsg)
  }
}

const sendQuickQuestion = (question) => {
  inputMessage.value = question
  handleSend()
}

const copyMessage = async (text) => {
  const ok = await copyText(text)
  if (ok) {
    ElMessage.success('已复制到剪贴板')
  } else {
    ElMessage.error('复制失败，请手动复制')
  }
}

// 导出对话为文件
const exportChat = async (format = 'json') => {
  try {
    let content = ''
    let filename = `对话_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}`

    if (format === 'json') {
      content = exportChatAsJSON(messages.value)
      filename += '.json'
    } else {
      content = exportChatAsText(messages.value)
      filename += '.txt'
    }

    // 创建下载链接
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败', error)
    ElMessage.error('导出失败，请稍后重试')
  }
}

const newChat = async () => {
  abortActiveStream()
  activeAiMsg = null
  const newId = generateSessionId()
  currentChatId.value = newId
  messages.value = []
  currentSessionModel.value = null
  sidebarVisible.value = false
  router.push(`/chat/${newId}`)
  await nextTick()
  await loadMessages()
}

const selectChat = async (id) => {
  sidebarVisible.value = false
  if (id === currentChatId.value) return

  abortActiveStream()
  activeAiMsg = null
  currentChatId.value = id
  router.push(`/chat/${id}`)
  syncSessionModel(id)
  await loadMessages()
}

// 同步当前会话锁定的模型到 UI（下拉框禁用 + 侧边栏展示）
const syncSessionModel = (sessionId) => {
  const session = chatSessions.value.find(s => s.sessionId === sessionId)
  if (session && session.model) {
    currentSessionModel.value = session.model
    selectedModel.value = session.model
  } else {
    currentSessionModel.value = null
    selectedModel.value = ''
  }
}

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

const closeSidebar = () => {
  sidebarVisible.value = false
}

const handleRename = ({ sessionId, title }) => {
  const session = chatSessions.value.find(s => s.sessionId === sessionId)
  if (session) session.title = title
}

const deleteChat = async (sessionId) => {
  try {
    await ElMessageBox.confirm('删除后该对话及其消息不可恢复，确定继续吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return // 用户取消
  }

  // 只有删除正在生成的会话才需要中断流，删除其他会话不应打断当前回复
  if (currentChatId.value === sessionId) {
    abortActiveStream()
    activeAiMsg = null
  }

  const exists = chatSessions.value.some(s => s.sessionId === sessionId)
  try {
    // 只存在于前端的空会话（还没发过消息）不需要请求后端
    if (exists) await clearSession(sessionId)
  } catch (e) {
    console.error('删除会话失败', e)
    ElMessage.error(e?.message || '删除会话失败，请稍后重试')
    return
  }

  chatSessions.value = chatSessions.value.filter(s => s.sessionId !== sessionId)

  if (currentChatId.value === sessionId) {
    if (chatSessions.value.length > 0) {
      currentChatId.value = chatSessions.value[0].sessionId
      syncSessionModel(currentChatId.value)
      router.push(`/chat/${currentChatId.value}`)
      await loadMessages()
    } else {
      await newChat()
    }
  }

  ElMessage.success('会话已删除')
}

const handleMobileCommand = (command) => {
  switch (command) {
    case 'history':
      router.push('/history')
      break
    case 'settings':
      router.push('/settings')
      break
    case 'export-json':
      exportChat('json')
      break
    case 'export-text':
      exportChat('text')
      break
    case 'logout':
      handleLogout()
      break
  }
}

// 登出功能
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
    userInfo.value = null
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch (e) {
    if (e !== 'cancel') {
      console.error('登出失败', e)
    }
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100%;
  width: 100%;
  background: var(--bg-base);
  position: relative;
  overflow: hidden;
}

/* 背景装饰光斑（LobeChat 式氛围） */
.decor-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  pointer-events: none;
  z-index: 0;
}

.decor-1 {
  width: 420px;
  height: 420px;
  top: -120px;
  left: 220px;
  background: var(--decor-blob-1);
}

.decor-2 {
  width: 480px;
  height: 480px;
  bottom: -160px;
  right: -120px;
  background: var(--decor-blob-2);
}

/* ========== 主内容区 ========== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: transparent;
  min-width: 0;
  position: relative;
  z-index: 1;
}

.chat-header {
  height: 60px;
  background: var(--bg-header);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 12px;
  z-index: 5;
}

.menu-btn {
  display: none;
}

.header-title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.header-model-tag {
  flex-shrink: 0;
  max-width: 150px;
  padding: 2px 9px;
  border-radius: 20px;
  border: 1px solid rgba(99, 102, 241, 0.25);
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.header-actions .header-action {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface-soft);
  color: var(--text-secondary);
  transition: all 0.2s ease;
  box-shadow: none;
}

.header-actions .header-action:hover {
  color: var(--color-primary);
  border-color: var(--color-primary-soft);
  background: var(--bg-surface);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.desktop-action {
  display: inline-flex;
}

.mobile-action {
  display: none;
}

/* ========== 消息区域 ========== */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-height: 0;
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-tertiary);
}

.loading-icon {
  animation: rotate 1s linear infinite;
  color: var(--color-primary);
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.load-older-tip {
  align-self: center;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-tertiary);
  padding: 8px 16px;
  background: var(--bg-surface);
  border-radius: 20px;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-sm);
}

.messages-stack {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* 滚动回底部按钮 */
.scroll-bottom-btn {
  position: absolute;
  bottom: 112px;
  right: 40px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  z-index: 6;
  color: var(--color-primary);
}

.scroll-bottom-btn:hover {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
}

/* 移动端遮罩 */
.sidebar-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
  backdrop-filter: blur(2px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .menu-btn {
    display: flex;
  }

  .chat-header {
    padding: 0 12px;
    gap: 8px;
  }

  .header-title {
    font-size: 15px;
  }

  .header-model-tag {
    max-width: 92px;
  }

  .header-actions {
    gap: 4px;
  }

  .header-actions .header-action {
    width: 30px;
    height: 30px;
    border-radius: 9px;
  }

  .desktop-action {
    display: none !important;
  }

  .mobile-action {
    display: inline-flex;
  }

  .chat-messages {
    padding: 18px 12px;
  }

  .messages-stack {
    gap: 18px;
  }

  .scroll-bottom-btn {
    bottom: 152px;
    right: 16px;
  }

  .decor-blob {
    display: none;
  }
}
</style>
