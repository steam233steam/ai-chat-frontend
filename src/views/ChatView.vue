<template>
  <div class="chat-container">
    <!-- 侧边栏遮罩（移动端） -->
    <div v-if="isMobile && sidebarVisible" class="sidebar-mask" @click="closeSidebar"></div>
    
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ show: sidebarVisible }">
      <div class="sidebar-header">
        <div class="logo">
          <el-icon :size="24" color="#667eea"><ChatDotRound /></el-icon>
          <span>AI 助手</span>
        </div>
        <el-button class="new-chat-btn" @click="newChat">
          <el-icon><Plus /></el-icon>
          新对话
        </el-button>
      </div>
      
      <div class="chat-list">
        <div 
          v-if="chatSessions.length === 0"
          class="empty-sessions"
        >
          <p>暂无对话记录</p>
        </div>
        <div 
          v-for="session in chatSessions" 
          :key="session.sessionId"
          :class="['chat-item', { active: currentChatId === session.sessionId }]"
          @click="selectChat(session.sessionId)"
          @contextmenu.prevent="showContextMenu($event, session)"
        >
          <el-icon class="chat-icon"><ChatDotRound /></el-icon>
          <span class="chat-title" v-if="editingSessionId !== session.sessionId">{{ session.title }}</span>
          
          <!-- 编辑输入框 -->
          <div v-if="editingSessionId === session.sessionId" class="edit-box" @click.stop>
            <input 
              v-model="editingTitle" 
              class="edit-input"
              maxlength="50"
              @keyup.enter="saveTitle(session.sessionId)"
              @keyup.escape="cancelEditing"
            />
            <span v-if="editingTitle.length > 40" class="title-limit-tip">{{ 50 - editingTitle.length }}</span>
            <button class="save-btn" @click="saveTitle(session.sessionId)">
              <el-icon><Check /></el-icon>
            </button>
            <button class="cancel-btn" @click="cancelEditing">
              <el-icon><Close /></el-icon>
            </button>
          </div>
          
          <!-- 三个点按钮（鼠标悬停时显示） -->
          <button class="more-btn" @click.stop="showContextMenu($event, session)">
            <el-icon><More /></el-icon>
          </button>
          
          <!-- 右键菜单 -->
          <div v-if="menuSession?.sessionId === session.sessionId" class="context-menu" @click.stop>
            <div class="context-menu-item" @click="startEditing(session.sessionId, session.title)">
              <el-icon><Edit /></el-icon>
              <span>重命名</span>
            </div>
            <div class="context-menu-item delete" @click="deleteChat(session.sessionId)">
              <el-icon><Delete /></el-icon>
              <span>删除</span>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="chat-main">
      <!-- 顶部导航 -->
      <header class="chat-header">
        <el-button class="menu-btn" @click="toggleSidebar" circle>
          <el-icon><Menu /></el-icon>
        </el-button>
        <div class="header-title">
          {{ currentSession?.title || '新对话' }}
        </div>
        <div class="header-actions">
          <!-- 用户信息（PC端显示） -->
          <div v-if="!isMobile && userInfo" class="user-info">
            <el-avatar :size="32">{{ userInfo.name?.charAt(0) || 'U' }}</el-avatar>
            <span class="user-name">{{ userInfo.name }}</span>
          </div>
          <!-- 删除当前对话按钮（仅移动端显示） -->
          <el-button v-if="isMobile" size="small" circle class="mobile-delete-btn" @click="deleteChat(currentChatId)" title="删除当前对话">
            <el-icon><Delete /></el-icon>
          </el-button>
          <!-- 历史 / 设置入口 -->
          <el-button size="small" title="历史记录" @click="router.push('/history')">
            <el-icon><Clock /></el-icon>
          </el-button>
          <el-button size="small" title="设置" @click="router.push('/settings')">
            <el-icon><Setting /></el-icon>
          </el-button>
          <!-- 导出按钮 -->
          <el-dropdown @command="(format) => exportChat(format)">
            <el-button size="small" title="导出对话">
              <el-icon><Download /></el-icon>
              <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="json">导出为 JSON</el-dropdown-item>
                <el-dropdown-item command="text">导出为文本</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <!-- 登出按钮 -->
          <el-button size="small" @click="handleLogout" title="登出">
            <el-icon><SwitchButton /></el-icon>
          </el-button>
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
        <div v-else-if="messages.length === 0" class="empty-state">
          <div class="empty-icon">
            <el-icon :size="80" color="#667eea"><ChatDotRound /></el-icon>
          </div>
          <h2>你好，有什么可以帮你的？</h2>
          <p>我可以帮你回答问题、写代码、翻译文本等</p>
          
          <!-- 快捷问题 -->
          <div class="quick-questions">
            <div 
              v-for="(q, index) in quickQuestions" 
              :key="index"
              class="quick-question"
              @click="sendQuickQuestion(q)"
            >
              <el-icon><Document /></el-icon>
              <span>{{ q }}</span>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-else>
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="['message', msg.role === 'user' ? 'user-message' : 'ai-message']"
          >
            <el-avatar :size="40" :class="msg.role === 'user' ? 'user-avatar' : 'ai-avatar'">
              <el-icon v-if="msg.role === 'ai'"><ChatDotRound /></el-icon>
              <span v-else>我</span>
            </el-avatar>
            <div class="message-content">
              <div class="message-header">
                <span class="sender-name">{{ msg.role === 'user' ? '你' : 'AI 助手' }}</span>
                <span v-if="msg.timestamp" class="message-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              <div class="message-bubble">
                <div v-if="msg.role === 'ai' && !msg.streaming" class="markdown-body" v-html="msg.html"></div>
                <p v-else-if="msg.role === 'ai' && msg.streaming" class="streaming-text">{{ msg.content || '思考中...' }}</p>
                <p v-else>{{ msg.content }}</p>
              </div>
              <div class="message-actions" v-if="msg.role === 'ai'">
                <el-button text size="small" @click="copyMessage(msg.content)">
                  <el-icon><CopyDocument /></el-icon>
                  复制
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 滚回底部按钮 -->
      <transition name="fade-slide">
        <button v-if="showScrollBottom" class="scroll-bottom-btn" @click="scrollToBottom">
          <el-icon><ArrowDown /></el-icon>
        </button>
      </transition>

      <!-- 输入区域 -->
      <div class="chat-input">
        <!-- 模型选择器（仅当可用模型 ≥2 时显示） -->
        <div v-if="showModelSelector" class="model-selector">
          <el-select
            v-model="selectedModel"
            :teleported="false"
            placeholder="默认模型"
            class="model-select"
            size="small"
          >
            <el-option
              v-for="m in modelOptions"
              :key="m"
              :label="m"
              :value="m"
            />
          </el-select>
          <span class="model-hint">模型</span>
        </div>
        <div class="input-wrapper">
          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="3"
            placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
            :autosize="{ minRows: 3, maxRows: 8 }"
            @keydown.enter="onEnterKey"
            class="message-input"
            autocomplete="off"
          />
          <div v-if="inputMessage.length > 8000" class="input-limit-tip">
            消息不能超过 8000 个字符（当前 {{ inputMessage.length }}）
          </div>
        </div>
        <el-button
          v-if="!isTyping"
          type="primary"
          class="send-btn"
          :disabled="!inputMessage.trim() || inputMessage.length > 8000"
          @click="handleSend"
        >
          <el-icon><Promotion /></el-icon>
          发送
        </el-button>
        <el-button
          v-else
          type="danger"
          class="stop-btn"
          @click="stopGeneration"
        >
          <el-icon><VideoPause /></el-icon>
          停止
        </el-button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ChatDotRound, Document, CopyDocument, Promotion,
  Plus, Menu, Edit, Delete, More, Check, Close, VideoPause, ArrowDown, SwitchButton, Download, Loading,
  Clock, Setting
} from '@element-plus/icons-vue'
import { sendMessageStream, getSessions, getHistory, updateTitle, clearSession, getModels } from '@/api/chat'
import { getUserInfo, logout } from '@/api/user'
import { renderMarkdown, enhanceCodeBlocks, exportChatAsJSON, exportChatAsText, copyText } from '@/utils/markdown'

const router = useRouter()
const inputMessage = ref('')
const messages = ref([])
const isTyping = ref(false)
const messageContainer = ref(null)
const currentChatId = ref(null)
const chatSessions = ref([])
const sidebarVisible = ref(false)
const isLoading = ref(false)
const editingSessionId = ref(null)
const editingTitle = ref('')
const menuSession = ref(null)
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
const showModelSelector = computed(() => modelOptions.value.length >= 2)

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

  document.addEventListener('click', hideContextMenu)
  window.addEventListener('resize', onResize)
  if (messageContainer.value) {
    messageContainer.value.addEventListener('scroll', onScroll)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
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

// 浏览器前进/后退时路由参数会变，但组件实例被复用，需要手动同步会话
watch(
  () => router.currentRoute.value.params.id,
  async (id) => {
    if (!id || id === currentChatId.value) return
    abortActiveStream()
    activeAiMsg = null
    currentChatId.value = id
    messages.value = []
    await loadMessages()
  }
)

const loadSessions = async () => {
  try {
    const res = await getSessions()
    if (res.code === 200) {
      chatSessions.value = res.data || []
    }
  } catch (e) {
    console.error('加载会话列表失败', e)
    chatSessions.value = []
  }
}

const loadMessages = async () => {
  if (!currentChatId.value) return
  
  isLoading.value = true
  try {
    const res = await getHistory(currentChatId.value)
    if (res.code === 200 && res.data) {
      messages.value = []
      msgIdCounter = 0
      for (const item of res.data) {
        // 兼容旧版字符串数组和 v5.0 对象结构
        const normalized = typeof item === 'string'
          ? { role: 'user', content: item, timestamp: null }
          : item

        if (!normalized) continue
        if (normalized.role === 'system') continue

        const content = normalized.content ?? ''
        const isAi = normalized.role !== 'user'
        messages.value.push({
          id: ++msgIdCounter,
          role: isAi ? 'ai' : 'user',
          content,
          // 历史消息只渲染一次 Markdown，避免流式输出时反复解析整个列表
          html: isAi ? renderMarkdown(content) : '',
          streaming: false,
          timestamp: normalized.timestamp ? new Date(normalized.timestamp) : new Date()
        })
      }
    } else {
      messages.value = []
    }
  } catch (e) {
    console.error('加载消息失败', e)
    messages.value = []
  } finally {
    isLoading.value = false
  }

  // 等列表真正渲染出来后再挂载代码块复制按钮并滚到底部
  await nextTick()
  enhanceCodeBlocks(messageContainer.value)
  await scrollToBottom()
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  
  // 超过7天显示具体日期
  return date.toLocaleDateString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
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

const onEnterKey = (e) => {
  // 中文输入法组词时按 Enter 只是确认候选词，不能当成发送
  if (e.shiftKey || e.isComposing || e.keyCode === 229) return
  // Enter 发送，Shift+Enter 换行
  e.preventDefault()
  handleSend()
}

// 把流式输出的纯文本气泡切成 Markdown
const finalizeStreamingMessage = () => {
  const msg = activeAiMsg
  activeAiMsg = null
  if (!msg || !msg.streaming) return
  msg.streaming = false
  msg.html = renderMarkdown(msg.content)
  nextTick(() => enhanceCodeBlocks(messageContainer.value))
}

const stopGeneration = () => {
  abortActiveStream()
  finalizeStreamingMessage()
  // 后端在取消时也会保存已生成的部分，重新拉一次列表同步标题
  loadSessions()
}

const handleSend = async () => {
  const trimmedInput = inputMessage.value.trim()
  if (!trimmedInput || isTyping.value) return

  if (trimmedInput.length > 8000) {
    ElMessage.warning('消息不能超过 8000 个字符')
    return
  }

  const userMsg = trimmedInput

  messages.value.push({
    id: ++msgIdCounter,
    role: 'user',
    content: userMsg,
    timestamp: new Date()
  })

  inputMessage.value = ''
  isTyping.value = true
  await scrollToBottom()

  // 创建一个临时的 AI 消息用于流式更新
  const aiMsg = reactive({
    id: ++msgIdCounter,
    role: 'ai',
    content: '',
    html: '',
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
        aiMsg.html = renderMarkdown(aiMsg.content)
        activeAiMsg = null
        isTyping.value = false
        abortController.value = null
        if (streamRAF) {
          cancelAnimationFrame(streamRAF)
          streamRAF = null
        }
        if (!hasReceivedData) {
          // 一个片段都没收到时不要留空白气泡
          messages.value = messages.value.filter(m => m !== aiMsg)
          ElMessage.warning('未收到 AI 回复，请稍后重试')
          return
        }
        nextTick(() => enhanceCodeBlocks(messageContainer.value))
        loadSessions()
      },
      (error) => {
        console.error('流式发送失败', error)
        activeAiMsg = null
        isTyping.value = false
        abortController.value = null
        if (streamRAF) {
          cancelAnimationFrame(streamRAF)
          streamRAF = null
        }
        if (error?.message) {
          ElMessage.error(error.message)
        } else {
          ElMessage.error('发送失败，请稍后重试')
        }
        messages.value = messages.value.filter(m => m !== aiMsg)
      },
      abortController.value.signal,
      selectedModel.value || undefined
    )
  } catch (e) {
    console.error('发送消息失败', e)
    activeAiMsg = null
    isTyping.value = false
    abortController.value = null
    if (streamRAF) {
      cancelAnimationFrame(streamRAF)
      streamRAF = null
    }
    ElMessage.error('发送失败，请稍后重试')
    messages.value = messages.value.filter(m => m !== aiMsg)
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
  sidebarVisible.value = false
  router.push(`/chat/${newId}`)
  await nextTick()
  await loadMessages()
}

const selectChat = async (id) => {
  menuSession.value = null
  abortActiveStream()
  activeAiMsg = null
  currentChatId.value = id
  sidebarVisible.value = false
  router.push(`/chat/${id}`)
  await loadMessages()
}

const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

const closeSidebar = () => {
  sidebarVisible.value = false
  menuSession.value = null
}

const showContextMenu = (event, session) => {
  menuSession.value = session
}

const hideContextMenu = () => {
  menuSession.value = null
}

const startEditing = (sessionId, currentTitle) => {
  menuSession.value = null
  editingSessionId.value = sessionId
  editingTitle.value = currentTitle
}

const saveTitle = async (sessionId) => {
  const title = editingTitle.value.trim()
  if (!title) {
    editingSessionId.value = null
    return
  }

  if (title.length > 50) {
    ElMessage.warning('标题不能超过 50 个字符')
    return
  }

  editingTitle.value = title
  try {
    await updateTitle(sessionId, title)
    const session = chatSessions.value.find(s => s.sessionId === sessionId)
    if (session) {
      session.title = editingTitle.value
    }
    ElMessage.success('标题已更新')
    editingSessionId.value = null
  } catch (e) {
    console.error('更新标题失败', e)
    ElMessage.error(e?.message || '更新标题失败')
  }
}

const cancelEditing = () => {
  editingSessionId.value = null
  editingTitle.value = ''
}

const deleteChat = async (sessionId) => {
  menuSession.value = null
  editingSessionId.value = null

  try {
    await ElMessageBox.confirm('删除后该对话及其消息不可恢复，确定继续吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return // 用户取消
  }

  // 删除正在生成的会话时先中断流，避免回复写回已删除的会话
  abortActiveStream()
  activeAiMsg = null

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
      router.push(`/chat/${currentChatId.value}`)
      await loadMessages()
    } else {
      await newChat()
    }
  }

  ElMessage.success('会话已删除')
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
  background: #f5f7fa;
  position: relative;
}

/* ========== 侧边栏 ========== */
.sidebar {
  width: 260px;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  z-index: 100;
  position: relative;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16px;
}

.new-chat-btn {
  width: 100%;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: #fff;
  font-size: 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-sessions {
  text-align: center;
  padding: 40px 16px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  margin-bottom: 4px;
}

.chat-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.chat-item.active {
  background: rgba(102, 126, 234, 0.3);
  border: 1px solid rgba(102, 126, 234, 0.5);
}

.chat-icon {
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

.chat-title {
  flex: 1;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-btn {
  opacity: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.chat-item:hover .more-btn {
  opacity: 1;
}

.more-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.context-menu {
  position: absolute;
  right: 36px;
  top: 50%;
  transform: translateY(-50%);
  background: #2a2a4a;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 4px;
  z-index: 10;
  min-width: 100px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.context-menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.context-menu-item.delete:hover {
  background: rgba(245, 108, 108, 0.2);
  color: #f56c6c;
}

.edit-box {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.edit-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 14px;
  min-width: 0;
}

.edit-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.title-limit-tip {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

.save-btn, .cancel-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  flex-shrink: 0;
}

.save-btn {
  background: rgba(103, 194, 58, 0.2);
  color: #67c23a;
}

.save-btn:hover {
  background: #67c23a;
  color: white;
}

.cancel-btn {
  background: rgba(245, 108, 108, 0.2);
  color: #f56c6c;
}

.cancel-btn:hover {
  background: #f56c6c;
  color: white;
}

.save-btn .el-icon, .cancel-btn .el-icon {
  font-size: 12px;
}

/* ========== 主内容区 ========== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  min-width: 0;
}

.chat-header {
  height: 56px;
  background: white;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
}

.menu-btn {
  display: none;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 20px;
  background: #f5f7fa;
}

.user-name {
  font-size: 13px;
  color: #606266;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ========== 消息区域 ========== */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #909399;
}

.loading-icon {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #909399;
}

.empty-icon {
  opacity: 0.3;
}

.empty-state h2 {
  font-size: 24px;
  color: #303133;
  margin: 0;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  max-width: 600px;
}

.quick-question {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 20px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-question:hover {
  background: #f5f7fa;
  border-color: #667eea;
  color: #667eea;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 85%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user-message {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.ai-message {
  align-self: flex-start;
}

.message-avatar {
  flex-shrink: 0;
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.ai-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}

.user-message .message-header {
  flex-direction: row-reverse;
}

.sender-name {
  font-weight: 500;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  position: relative;
}

.user-message .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 4px 12px;
}

.ai-message .message-bubble {
  background: white;
  color: #303133;
  border: 1px solid #e4e7ed;
  border-radius: 12px 12px 12px 4px;
}

.streaming-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
  word-break: break-word;
}

.message-actions {
  display: flex;
  gap: 4px;
  padding: 0 4px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.ai-message:hover .message-actions {
  opacity: 1;
}

/* 滚动回底部按钮 */
.scroll-bottom-btn {
  position: fixed;
  bottom: 100px;
  right: 40px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  z-index: 10;
}

.scroll-bottom-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

/* 输入区域 */
.chat-input {
  padding: 16px 24px;
  background: white;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}

/* 模型选择器 */
.model-selector {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-select {
  width: 200px;
}

.model-hint {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.input-wrapper {
  flex: 1;
}

.message-input {
  background: #f5f7fa !important;
  border: none !important;
  border-radius: 12px !important;
}

.message-input :deep(.el-textarea__inner) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  resize: none;
  padding: 12px;
}

.input-limit-tip {
  margin-top: 6px;
  font-size: 12px;
  color: #f56c6c;
}

.send-btn, .stop-btn {
  height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  font-weight: 500;
}

.send-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

/* Markdown 样式 */
.markdown-body {
  font-size: 14px;
  line-height: 1.6;
}

.markdown-body p {
  margin: 0 0 8px 0;
}

.markdown-body p:last-child {
  margin-bottom: 0;
}

.markdown-body pre {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  margin: 8px 0;
  position: relative;
}

.markdown-body code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.markdown-body :not(pre) > code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.markdown-body blockquote {
  border-left: 4px solid #667eea;
  padding-left: 12px;
  margin: 8px 0;
  color: #606266;
}

/* 代码块复制按钮 */
.code-copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.markdown-body pre:hover .code-copy-btn {
  opacity: 1;
}

.code-copy-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}

/* 自定义滚动条 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #909399;
}

.chat-list::-webkit-scrollbar {
  width: 4px;
}

.chat-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

/* 移动端遮罩 */
.sidebar-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
    width: 280px;
  }
  
  .sidebar.show {
    transform: translateX(0);
  }
  
  .menu-btn {
    display: flex;
  }
  
  .chat-messages {
    padding: 16px;
  }
  
  .message {
    max-width: 90%;
  }
  
  .chat-input {
    padding: 12px 16px;
  }
  
  .model-selector {
    order: -1;
    width: 100%;
    margin-bottom: 8px;
  }
  
  .user-info {
    display: none;
  }
  
  .quick-questions {
    padding: 0 16px;
  }
  
  .scroll-bottom-btn {
    bottom: 90px;
    right: 20px;
  }
}
</style>
