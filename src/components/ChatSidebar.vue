<template>
  <aside class="sidebar" :class="{ show: visible }">
    <div class="sidebar-header">
      <div class="logo">
        <el-icon :size="24" color="var(--color-primary-soft)"><ChatDotRound /></el-icon>
        <span>AI 助手</span>
      </div>
      <el-button class="new-chat-btn" @click="handleNewChat">
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
        @click="selectSession(session.sessionId)"
        @contextmenu.prevent="showMenu(session)"
      >
        <el-icon class="chat-icon"><ChatDotRound /></el-icon>
        <div class="chat-title-wrap">
          <span class="chat-title" v-if="editingId !== session.sessionId">{{ session.title }}</span>
          <span v-if="session.model" class="session-model-tag" :title="'锁定模型：' + session.model">{{ session.model }}</span>
        </div>

        <div v-if="editingId === session.sessionId" class="edit-box" @click.stop>
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

        <button class="more-btn" @click.stop="showMenu(session)">
          <el-icon><More /></el-icon>
        </button>

        <div v-if="menuId === session.sessionId" class="context-menu" @click.stop>
          <div class="context-menu-item" @click="beginEdit(session)">
            <el-icon><Edit /></el-icon>
            <span>重命名</span>
          </div>
          <div class="context-menu-item delete" @click="removeSession(session.sessionId)">
            <el-icon><Delete /></el-icon>
            <span>删除</span>
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-user-card">
        <el-avatar :size="34" class="sidebar-avatar">{{ userName?.charAt(0) || 'U' }}</el-avatar>
        <div class="sidebar-user-meta">
          <span class="sidebar-user-name">{{ userName || '未登录' }}</span>
          <span class="sidebar-user-status"><i></i> 多模型在线</span>
        </div>
        <el-button text circle class="sidebar-icon-btn" title="设置" @click="emit('settings')">
          <el-icon><Setting /></el-icon>
        </el-button>
        <el-button text circle class="sidebar-icon-btn" title="登出" @click="emit('logout')">
          <el-icon><SwitchButton /></el-icon>
        </el-button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ChatDotRound, Plus, Search, ChatLineSquare, More, Check, Close, Edit, Delete, Setting, SwitchButton
} from '@element-plus/icons-vue'
import { updateTitle } from '@/api/chat'

const props = defineProps({
  sessions: { type: Array, default: () => [] },
  currentChatId: { type: String, default: null },
  userName: { type: String, default: '' },
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['new-chat', 'select', 'rename', 'delete', 'settings', 'logout'])

const sessionQuery = ref('')
const editingId = ref(null)
const editingTitle = ref('')
const menuId = ref(null)

const filteredSessions = computed(() => {
  const keyword = sessionQuery.value.trim().toLowerCase()
  if (!keyword) return props.sessions
  return props.sessions.filter((session) =>
    (session.title || '').toLowerCase().includes(keyword)
  )
})

const hideMenu = () => {
  menuId.value = null
}

const handleNewChat = () => {
  sessionQuery.value = ''
  hideMenu()
  emit('new-chat')
}

const selectSession = (sessionId) => {
  hideMenu()
  emit('select', sessionId)
}

const showMenu = (session) => {
  menuId.value = session.sessionId
}

const beginEdit = (session) => {
  hideMenu()
  editingId.value = session.sessionId
  editingTitle.value = session.title
}

const cancelEditing = () => {
  editingId.value = null
  editingTitle.value = ''
}

const saveTitle = async (sessionId) => {
  const title = editingTitle.value.trim()
  if (!title) {
    cancelEditing()
    return
  }
  if (title.length > 50) {
    ElMessage.warning('标题不能超过 50 个字符')
    return
  }

  try {
    await updateTitle(sessionId, title)
    emit('rename', { sessionId, title })
    ElMessage.success('标题已更新')
    cancelEditing()
  } catch (e) {
    console.error('更新标题失败', e)
    ElMessage.error(e?.message || '更新标题失败')
  }
}

const removeSession = (sessionId) => {
  hideMenu()
  emit('delete', sessionId)
}

onMounted(() => document.addEventListener('click', hideMenu))
onUnmounted(() => document.removeEventListener('click', hideMenu))
</script>

<style scoped>
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
}
</style>
