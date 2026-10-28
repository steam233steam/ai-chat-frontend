<template>
  <div class="chat-container">
    <div class="decor-blob decor-1"></div>
    <div class="decor-blob decor-2"></div>
    <!-- 侧边栏遮罩（移动端） -->
    <div v-if="isMobile && sidebarVisible" class="sidebar-mask" @click="closeSidebar"></div>

    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ show: sidebarVisible }">
      <div class="sidebar-header">
        <div class="logo">
          <el-icon :size="24" color="var(--color-primary-soft)"><ChatDotRound /></el-icon>
          <span>AI 助手</span>
        </div>
        <el-button class="new-chat-btn" @click="newChat">
          <el-icon><Plus /></el-icon>
          新对话
        </el-button>
        <el-input
          v-model="sessionQuery"
          placeholder="搜索对话..."
          :prefix-icon="Search"
          clearable
          class="session-search"
        />
      </div>

      <div class="sidebar-section-title">
        <span>最近对话</span>
        <span class="session-count">{{ filteredSessions.length }}</span>
      </div>
      <div class="chat-list">
        <div
          v-if="filteredSessions.length === 0"
          class="empty-sessions"
        >
          <el-icon :size="30"><Search v-if="sessionQuery" /><ChatLineSquare v-else /></el-icon>
          <p>{{ sessionQuery ? '没有匹配的对话' : '暂无对话记录' }}</p>
          <span>{{ sessionQuery ? '换个关键词试试' : '点击上方“新对话”开始' }}</span>
        </div>
        <div
          v-for="session in filteredSessions"
          :key="session.sessionId"
          :class="['chat-item', { active: currentChatId === session.sessionId }]"
          @click="selectChat(session.sessionId)"
          @contextmenu.prevent="showContextMenu($event, session)"
        >
          <el-icon class="chat-icon"><ChatDotRound /></el-icon>
          <div class="chat-title-wrap">
            <span class="chat-title" v-if="editingSessionId !== session.sessionId">{{ session.title }}</span>
            <span v-if="session.model" class="session-model-tag" :title="'锁定模型：' + session.model">{{ session.model }}</span>
          </div>

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

      <div class="sidebar-footer">
        <div class="sidebar-user-card">
          <el-avatar :size="34" class="sidebar-avatar">{{ userInfo?.name?.charAt(0) || 'U' }}</el-avatar>
          <div class="sidebar-user-meta">
            <span class="sidebar-user-name">{{ userInfo?.name || '未登录' }}</span>
            <span class="sidebar-user-status"><i></i> 多模型在线</span>
          </div>
          <el-button text circle class="sidebar-icon-btn" title="设置" @click="router.push('/settings')">
            <el-icon><Setting /></el-icon>
          </el-button>
          <el-button text circle class="sidebar-icon-btn" title="登出" @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
          </el-button>
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
        <div v-else-if="messages.length === 0" class="empty-state">
          <div class="empty-icon-wrap">
            <div class="empty-icon-glow"></div>
            <div class="empty-icon">
              <el-icon :size="64"><ChatDotRound /></el-icon>
            </div>
          </div>
          <span class="empty-eyebrow">AI CHAT · MULTI-MODEL</span>
          <h2>你好，有什么可以帮你的？</h2>
          <p>支持 Markdown、代码高亮与多模型切换</p>

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
              <el-icon class="quick-arrow"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <AnimatePresence v-else>
          <div class="messages-stack">
            <!-- 加载更早历史提示（滚到顶部触发） -->
            <div v-if="isLoadingOlder" class="load-older-tip">
              <el-icon class="loading-icon" :size="18"><Loading /></el-icon>
              <span>加载更早的消息...</span>
            </div>
            <motion.div
              v-for="msg in messages"
              :key="msg.id"
              :class="['message', msg.role === 'user' ? 'user-message' : 'ai-message']"
              initial="hidden"
              :animate="msg.role === 'ai' && msg.streaming ? 'streaming' : 'shown'"
              :variants="messageVariants"
            >
              <el-avatar :size="40" :class="msg.role === 'user' ? 'user-avatar' : 'ai-avatar'">
                <el-icon v-if="msg.role === 'ai'"><ChatDotRound /></el-icon>
                <span v-else>我</span>
              </el-avatar>
              <div class="message-content">
                <div class="message-header">
                  <span class="sender-name">{{ msg.role === 'user' ? '你' : 'AI 助手' }}</span>
                  <span v-if="msg.role === 'ai' && msg.model" class="message-model">{{ msg.model }}</span>
                  <span v-if="msg.streaming" class="message-streaming"><i></i>正在生成</span>
                  <span v-else-if="msg.timestamp" class="message-time">{{ formatTime(msg.timestamp) }}</span>
                </div>
                <div class="message-bubble">
                  <StreamingMarkdown
                    v-if="msg.role === 'ai'"
                    :content="msg.content"
                    :streaming="!!msg.streaming"
                  />
                  <p v-else class="plain-text">{{ msg.content }}</p>
                </div>
                <div class="message-actions" v-if="!msg.streaming">
                  <el-button text size="small" @click="copyMessage(msg.content)">
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </el-button>
                </div>
              </div>
            </motion.div>
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
      <div class="chat-input">
        <div class="composer" :class="{ focused: inputFocused }">
          <div class="composer-toolbar">
            <!-- 模型选择器（仅当可用模型 ≥2 时显示） -->
            <div v-if="showModelSelector" class="model-selector">
              <el-icon class="model-icon"><MagicStick /></el-icon>
              <el-select
                v-model="selectedModel"
                :teleported="false"
                :placeholder="modelLocked ? '已锁定' : '默认模型'"
                :disabled="modelLocked"
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
              <span v-if="modelLocked" class="model-hint locked">
                <el-icon><Lock /></el-icon>
                会话已锁定
              </span>
            </div>
            <div class="composer-meta">
              <span class="composer-shortcut">Enter 发送 · Shift + Enter 换行</span>
              <span class="composer-count" :class="{ over: inputMessage.length > 8000 }">
                {{ inputMessage.length }} / 8000
              </span>
            </div>
          </div>
          <div class="composer-body">
            <el-input
              v-model="inputMessage"
              type="textarea"
              :rows="3"
              placeholder="输入消息，开始新的对话..."
              :autosize="{ minRows: 3, maxRows: 8 }"
              @keydown.enter="onEnterKey"
              @focus="inputFocused = true"
              @blur="inputFocused = false"
              class="message-input"
              autocomplete="off"
            />
            <el-button
              v-if="!isTyping"
              type="primary"
              class="send-btn"
              :disabled="!inputMessage.trim() || inputMessage.length > 8000"
              @click="handleSend"
            >
              <el-icon><Promotion /></el-icon>
              <span class="btn-label">发送</span>
            </el-button>
            <el-button
              v-else
              type="danger"
              class="stop-btn"
              @click="stopGeneration"
            >
              <el-icon><VideoPause /></el-icon>
              <span class="btn-label">停止</span>
            </el-button>
          </div>
          <div v-if="inputMessage.length > 8000" class="input-limit-tip">
            消息不能超过 8000 个字符（当前 {{ inputMessage.length }}）
          </div>
        </div>
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
  Clock, Setting, ChatLineSquare, MagicStick, Lock, MoreFilled, ArrowRight, Search
} from '@element-plus/icons-vue'
import { sendMessageStream, getSessions, getHistory, updateTitle, clearSession, getModels } from '@/api/chat'
import { getUserInfo, logout } from '@/api/user'
import { enhanceCodeBlocks, exportChatAsJSON, exportChatAsText, copyText } from '@/utils/markdown'
import StreamingMarkdown from '@/components/StreamingMarkdown.vue'
import { useTheme } from '@/composables/useTheme'
import { AnimatePresence, motion } from 'motion-v'
import { Moon, Sunny } from '@element-plus/icons-vue'

const router = useRouter()
const inputMessage = ref('')
const inputFocused = ref(false)
const { isDark, toggle } = useTheme()
const messages = ref([])
const isTyping = ref(false)
const messageContainer = ref(null)
const currentChatId = ref(null)
const chatSessions = ref([])
const sessionQuery = ref('')
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

const filteredSessions = computed(() => {
  const keyword = sessionQuery.value.trim().toLowerCase()
  if (!keyword) return chatSessions.value
  return chatSessions.value.filter((session) =>
    (session.title || '').toLowerCase().includes(keyword)
  )
})

const isMobile = computed(() => windowWidth.value <= 768)

// motion-vue 消息入场/退场动画
const messageVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  shown: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
  },
  streaming: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.2, ease: 'easeOut' }
  }
}

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
  sessionQuery.value = ''
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
  menuSession.value = null
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

/* ========== 侧边栏 ========== */
.sidebar {
  width: 272px;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 100;
  position: relative;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.12);
}

.sidebar-header {
  padding: 18px 16px 14px;
  border-bottom: 1px solid var(--border-sidebar);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 600;
  color: var(--text-sidebar);
  margin-bottom: 16px;
  letter-spacing: 0.3px;
}

.new-chat-btn {
  width: 100%;
  height: 42px;
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  border: none;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
}

.new-chat-btn:hover {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
}

.sidebar-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.4px;
  color: var(--text-sidebar-soft);
  text-transform: uppercase;
}

.session-count {
  min-width: 20px;
  padding: 1px 7px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-sidebar-soft);
  font-size: 10px;
  text-align: center;
  letter-spacing: 0;
}

.session-search {
  margin-top: 12px;
}

.session-search :deep(.el-input__wrapper) {
  padding: 2px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.07);
  box-shadow: none !important;
  transition: all 0.2s ease;
}

.session-search :deep(.el-input__wrapper:hover),
.session-search :deep(.el-input__wrapper.is-focus) {
  border-color: rgba(129, 140, 248, 0.55);
  background: rgba(255, 255, 255, 0.1);
}

.session-search :deep(.el-input__inner) {
  height: 30px;
  color: var(--text-sidebar);
  font-size: 12px;
}

.session-search :deep(.el-input__inner)::placeholder {
  color: var(--text-sidebar-soft);
}

.session-search :deep(.el-input__prefix),
.session-search :deep(.el-input__suffix) {
  color: var(--text-sidebar-soft);
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 10px 16px;
}

.empty-sessions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  padding: 44px 16px;
  color: var(--text-sidebar-soft);
  font-size: 13px;
}

.empty-sessions .el-icon {
  color: rgba(129, 140, 248, 0.75);
  margin-bottom: 4px;
}

.empty-sessions p {
  margin: 0;
  color: var(--text-sidebar);
  font-weight: 500;
}

.empty-sessions span {
  font-size: 11px;
  opacity: 0.7;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s ease;
  position: relative;
  margin-bottom: 4px;
  border: 1px solid transparent;
}

.chat-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.chat-item.active {
  background: rgba(99, 102, 241, 0.22);
  border-color: rgba(129, 140, 248, 0.4);
  box-shadow: inset 0 0 0 1px rgba(129, 140, 248, 0.15);
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border-sidebar);
  background: rgba(0, 0, 0, 0.14);
}

.sidebar-user-card {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.06);
}

.sidebar-avatar {
  flex-shrink: 0;
  color: #fff;
  font-size: 14px;
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
}

.sidebar-user-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-user-name {
  color: var(--text-sidebar);
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-user-status {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-sidebar-soft);
  font-size: 10px;
}

.sidebar-user-status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 8px var(--color-success);
}

.sidebar-icon-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  color: var(--text-sidebar-soft);
}

.sidebar-icon-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.chat-item.active::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 9px;
  bottom: 9px;
  width: 3px;
  border-radius: 0 4px 4px 0;
  background: linear-gradient(180deg, var(--color-primary-soft), #a855f7);
  box-shadow: 0 0 10px rgba(129, 140, 248, 0.65);
}

.chat-icon {
  color: var(--text-sidebar-soft);
  flex-shrink: 0;
  font-size: 16px;
}

.chat-item.active .chat-icon {
  color: var(--color-primary-soft);
}

.chat-title {
  font-size: 14px;
  color: var(--text-sidebar);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 400;
}

.chat-title-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.chat-title-wrap .chat-title {
  flex: 0 1 auto;
  min-width: 0;
}

.session-model-tag {
  align-self: flex-start;
  font-size: 10px;
  line-height: 1.4;
  padding: 1px 7px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.28);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(129, 140, 248, 0.4);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.more-btn {
  opacity: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-sidebar-soft);
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
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.context-menu {
  position: absolute;
  right: 36px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--bg-surface-soft);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  padding: 4px;
  z-index: 10;
  min-width: 110px;
  backdrop-filter: var(--glass-blur);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.context-menu-item:hover {
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-primary);
}

.context-menu-item.delete:hover {
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-danger);
}

.edit-box {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.edit-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  outline: none;
  color: #fff;
  font-size: 13px;
  min-width: 0;
  padding: 4px 8px;
  border-radius: 6px;
}

.edit-input:focus {
  border-color: var(--color-primary-soft);
}

.title-limit-tip {
  font-size: 12px;
  color: var(--text-sidebar-soft);
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
  background: rgba(34, 197, 94, 0.25);
  color: var(--color-success);
}

.save-btn:hover {
  background: var(--color-success);
  color: #fff;
}

.cancel-btn {
  background: rgba(239, 68, 68, 0.25);
  color: var(--color-danger);
}

.cancel-btn:hover {
  background: var(--color-danger);
  color: #fff;
}

.save-btn .el-icon, .cancel-btn .el-icon {
  font-size: 12px;
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

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--text-tertiary);
  animation: emptyFadeIn 0.5s ease;
}

@keyframes emptyFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.empty-icon-wrap {
  position: relative;
  width: 108px;
  height: 108px;
  display: grid;
  place-items: center;
  margin-bottom: 4px;
}

.empty-icon-glow {
  position: absolute;
  inset: -24px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.35), transparent 65%);
  filter: blur(18px);
  animation: glowPulse 3.2s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.55; transform: scale(0.96); }
  50% { opacity: 0.9; transform: scale(1.06); }
}

.empty-icon {
  position: relative;
  width: 84px;
  height: 84px;
  display: grid;
  place-items: center;
  border-radius: 26px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  color: #fff;
  box-shadow:
    0 12px 32px rgba(99, 102, 241, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  transform: rotate(-4deg);
}

.empty-eyebrow {
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid rgba(99, 102, 241, 0.22);
  background: rgba(99, 102, 241, 0.08);
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.8px;
}

.empty-state h2 {
  font-size: 26px;
  font-weight: 700;
  background: linear-gradient(100deg, var(--color-primary) 0%, #8b5cf6 60%, var(--color-primary-soft) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin: 0;
  letter-spacing: 0.5px;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
  color: var(--text-tertiary);
}

.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  max-width: 580px;
  margin-top: 8px;
}

.quick-question {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  font-size: 13.5px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.quick-arrow {
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.2s ease;
}

.quick-question:hover .quick-arrow {
  opacity: 1;
  transform: translateX(0);
}

.quick-question:hover {
  border-color: var(--color-primary-soft);
  color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
}

.messages-stack {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 82%;
  animation: messageIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
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
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
}

.ai-avatar {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 4px 14px rgba(245, 87, 108, 0.3);
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.user-message .message-header {
  flex-direction: row-reverse;
}

.sender-name {
  font-weight: 600;
  color: var(--text-secondary);
}

.message-model {
  max-width: 150px;
  padding: 1px 7px;
  border-radius: 20px;
  border: 1px solid rgba(99, 102, 241, 0.18);
  background: rgba(99, 102, 241, 0.08);
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-bubble {
  padding: 14px 18px;
  border-radius: var(--radius-lg);
  font-size: 15px;
  line-height: 1.65;
  word-break: break-word;
  position: relative;
}

.user-message .message-bubble {
  background: var(--bubble-user-bg);
  color: var(--bubble-user-text);
  border-radius: 18px 18px 6px 18px;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
}

.ai-message .message-bubble {
  background: var(--bubble-ai-bg);
  color: var(--bubble-ai-text);
  border: 1px solid var(--bubble-ai-border);
  border-radius: 18px 18px 18px 6px;
  box-shadow: var(--bubble-ai-shadow);
}

.plain-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}

.streaming-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.7;
  word-break: break-word;
}

.message-actions {
  display: flex;
  gap: 4px;
  padding: 0 2px;
  margin-top: 2px;
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.message:hover .message-actions,
.message:focus-within .message-actions {
  opacity: 1;
  transform: translateY(0);
}

.user-message .message-actions {
  justify-content: flex-end;
}

.message-actions .el-button {
  height: 28px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--text-tertiary);
  font-size: 12px;
  transition: all 0.2s ease;
}

.message-actions .el-button:hover {
  color: var(--color-primary);
  border-color: var(--border-subtle);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.message-streaming {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 500;
}

.message-streaming i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: statusPulse 1.1s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% { opacity: 0.35; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
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

/* 输入区域 */
.chat-input {
  position: relative;
  z-index: 5;
  padding: 10px 24px 18px;
  background: linear-gradient(180deg, transparent 0%, var(--bg-base) 62%);
}

.composer {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 12px 14px;
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  background: var(--bg-surface);
  box-shadow: var(--shadow-md);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.composer.focused {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow);
}

.composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 4px 10px;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.model-icon {
  color: var(--color-primary);
  font-size: 15px;
}

.model-select {
  width: 180px;
}

.model-select :deep(.el-select__wrapper) {
  min-height: 32px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: var(--bg-surface-soft);
  box-shadow: none !important;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.model-select :deep(.el-select__wrapper.is-focused) {
  border-color: var(--color-primary-soft);
  background: var(--bg-surface);
}

.model-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 20px;
  background: rgba(245, 158, 11, 0.12);
  color: var(--color-warning);
  font-size: 11px;
  flex-shrink: 0;
}

.composer-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.composer-shortcut {
  font-size: 11px;
  color: var(--text-tertiary);
}

.composer-count {
  font-size: 11px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.composer-count.over {
  color: var(--color-danger);
  font-weight: 600;
}

.composer-body {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.message-input {
  flex: 1;
  min-width: 0;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.message-input :deep(.el-textarea__inner) {
  min-height: 64px;
  padding: 6px 6px 8px;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--text-primary);
  font-size: 14.5px;
  line-height: 1.6;
  resize: none;
}

.message-input :deep(.el-textarea__inner)::placeholder {
  color: var(--text-tertiary);
}

.input-limit-tip {
  margin: 0;
  padding: 6px 6px 0;
  font-size: 12px;
  color: var(--color-danger);
}

.send-btn,
.stop-btn {
  height: 42px;
  padding: 0 18px;
  border-radius: 12px;
  font-weight: 500;
  flex-shrink: 0;
  transition: all 0.2s;
}

.send-btn {
  border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 22px rgba(99, 102, 241, 0.55);
}

.send-btn:disabled {
  opacity: 0.5;
  box-shadow: none;
}

.stop-btn {
  border: none;
  background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
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

  .message {
    max-width: 94%;
  }

  .chat-input {
    padding: 8px 12px 12px;
  }

  .composer {
    padding: 10px 12px;
    border-radius: 18px;
  }

  .composer-toolbar {
    padding-bottom: 8px;
  }

  .composer-shortcut {
    display: none;
  }

  .model-selector {
    flex: 1;
  }

  .model-select {
    width: 150px;
  }

  .model-hint {
    display: none;
  }

  .quick-questions {
    padding: 0 8px;
    width: 100%;
  }

  .quick-question {
    width: 100%;
    justify-content: flex-start;
  }

  .quick-arrow {
    margin-left: auto;
    opacity: 1;
    transform: none;
  }

  .empty-icon-wrap {
    width: 92px;
    height: 92px;
  }

  .empty-icon {
    width: 72px;
    height: 72px;
    border-radius: 22px;
  }

  .empty-state h2 {
    font-size: 22px;
    text-align: center;
  }

  .scroll-bottom-btn {
    bottom: 152px;
    right: 16px;
  }

  .send-btn,
  .stop-btn {
    width: 42px;
    padding: 0;
  }

  .send-btn .btn-label,
  .stop-btn .btn-label {
    display: none;
  }

  .decor-blob {
    display: none;
  }
}
</style>
