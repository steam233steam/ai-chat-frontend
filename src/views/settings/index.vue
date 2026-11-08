<template>
  <div class="settings-shell">
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
      @open-tasks="router.push('/tasks')"
      @settings="sidebarVisible = false"
      @logout="handleLogout"
    />

    <div class="settings-page">
      <div class="page-header">
        <el-button v-if="isMobile" class="back-btn" aria-label="打开会话列表" @click="sidebarVisible = true">
          <el-icon><Menu /></el-icon>
        </el-button>
        <div class="title-block">
          <h2>设置</h2>
          <p class="subtitle">账户与外观</p>
        </div>
      </div>

      <div class="settings-body">
        <!-- 账户 -->
        <section class="card" v-loading="loading">
          <div class="account">
            <el-avatar :size="52" class="account-avatar">{{ avatarText }}</el-avatar>
            <div class="account-meta">
              <div class="account-name">{{ userInfo?.name || '未登录' }}</div>
              <div class="account-phone">{{ maskedPhone }}</div>
            </div>
            <el-tag v-if="userInfo?.isNewUser" type="warning" size="small" effect="light">待设置密码</el-tag>
          </div>

          <div class="field-row">
            <el-input
              v-model="name"
              maxlength="20"
              show-word-limit
              placeholder="输入昵称"
              @keyup.enter="saveName"
            />
            <el-button type="primary" :loading="saving" :disabled="!canSave" @click="saveName">
              保存
            </el-button>
          </div>

          <div class="card-footer">
            <el-button text class="footer-link" @click="gotoHistory">
              对话历史
              <el-icon><ArrowRight /></el-icon>
            </el-button>
            <el-button type="danger" plain :loading="loggingOut" @click="handleLogout">退出登录</el-button>
          </div>
        </section>

        <!-- 外观 -->
        <section class="card">
          <div class="section-title">外观</div>
          <div class="theme-options">
            <button
              class="theme-option"
              :class="{ active: !isDark }"
              type="button"
              @click="setTheme('light')"
            >
              <el-icon><Sunny /></el-icon>
              浅色
            </button>
            <button
              class="theme-option"
              :class="{ active: isDark }"
              type="button"
              @click="setTheme('dark')"
            >
              <el-icon><Moon /></el-icon>
              深色
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Menu, Moon, Sunny } from '@element-plus/icons-vue'
import ChatSidebar from '@/components/ChatSidebar.vue'
import { getUserInfo, updateProfile, logout } from '@/api/user'
import { getSessions, clearSession } from '@/api/chat'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const { isDark, set } = useTheme()

const userInfo = ref(null)
const name = ref('')
const loading = ref(false)
const saving = ref(false)
const loggingOut = ref(false)

const isMobile = ref(false)
const sidebarVisible = ref(false)
const sessions = ref([])
const userName = ref('')

const updateIsMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) sidebarVisible.value = false
}

const avatarText = computed(() => userInfo.value?.name?.charAt(0) || 'U')

const maskedPhone = computed(() => {
  const phone = userInfo.value?.phone || ''
  return /^\d{11}$/.test(phone) ? phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : phone
})

const canSave = computed(() => {
  const trimmed = name.value.trim()
  return trimmed.length > 0 && trimmed !== (userInfo.value?.name || '')
})

const setTheme = (value) => set(value)

const gotoHistory = () => router.push('/history')

const loadUser = async () => {
  loading.value = true
  try {
    const res = await getUserInfo()
    if (res.code === 200) {
      userInfo.value = res.data
      name.value = res.data?.name || ''
      userName.value = res.data?.name || ''
      localStorage.setItem('loginUser', JSON.stringify(res.data))
    }
  } catch (error) {
    ElMessage.error(error?.message || '加载用户信息失败')
  } finally {
    loading.value = false
  }
}

const loadSessions = async () => {
  try {
    const res = await getSessions()
    if (res.code === 200) sessions.value = res.data || []
  } catch (error) {
    console.error('加载会话列表失败', error)
  }
}

const saveName = async () => {
  const trimmed = name.value.trim()
  if (!trimmed || saving.value) return
  saving.value = true
  try {
    await updateProfile(trimmed)
    userInfo.value = { ...userInfo.value, name: trimmed }
    userName.value = trimmed
    localStorage.setItem('loginUser', JSON.stringify(userInfo.value))
    ElMessage.success('昵称已更新')
  } catch (error) {
    ElMessage.error(error?.message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
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
  const session = sessions.value.find((item) => item.sessionId === sessionId)
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
    sessions.value = sessions.value.filter((item) => item.sessionId !== sessionId)
    ElMessage.success('对话已删除')
  } catch (error) {
    ElMessage.error(error?.message || '删除会话失败')
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }

  loggingOut.value = true
  try {
    await logout()
  } catch (error) {
    console.warn('登出接口调用失败，继续本地登出', error)
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('loginUser')
    loggingOut.value = false
    ElMessage.success('已退出登录')
    await router.replace('/login')
  }
}

onMounted(() => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
  loadUser()
  loadSessions()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
})
</script>

<style scoped>
.settings-shell {
  display: flex;
  height: 100vh;
  background: var(--bg-base);
}

.settings-page {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  box-sizing: border-box;
}

.page-header {
  max-width: 640px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-block h2 {
  margin: 0;
  font-size: 21px;
  font-weight: 700;
  color: var(--text-primary);
}

.title-block .subtitle {
  margin: 3px 0 0;
  font-size: 13px;
  color: var(--text-tertiary);
}

.back-btn {
  color: var(--text-secondary);
  border-radius: 10px;
  padding: 8px 10px;
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 640px;
  margin: 0 auto;
}

.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 20px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.02em;
  margin-bottom: 14px;
}

.account {
  display: flex;
  align-items: center;
  gap: 14px;
}

.account-avatar {
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  font-size: 20px;
  color: #fff;
}

.account-meta {
  flex: 1;
  min-width: 0;
}

.account-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.account-phone {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 3px;
}

.field-row {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.footer-link {
  color: var(--text-secondary);
  padding: 0;
}

.footer-link:hover {
  color: var(--color-primary);
}

.theme-options {
  display: flex;
  gap: 10px;
}

.theme-option {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface-soft);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.theme-option:hover {
  border-color: var(--color-primary-soft);
}

.theme-option.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-soft-bg, rgba(99, 102, 241, 0.08));
  font-weight: 600;
}

@media (max-width: 768px) {
  .settings-page {
    padding: 16px 14px 28px;
  }

  .card {
    padding: 16px;
  }

  .field-row {
    flex-wrap: nowrap;
  }

  .card-footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .card-footer .el-button {
    width: 100%;
    margin-left: 0;
  }

  .footer-link {
    justify-content: center;
  }
}
</style>
