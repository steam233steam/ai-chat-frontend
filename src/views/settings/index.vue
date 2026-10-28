<template>
  <div class="settings-page">
    <div class="page-header">
      <el-button class="back-btn" @click="router.push('/chat')">
        <el-icon><ArrowLeft /></el-icon>
        返回对话
      </el-button>
      <div class="title-block">
        <h2>设置</h2>
        <p class="subtitle">管理你的账户与服务配置</p>
      </div>
    </div>

    <div class="settings-body">
      <!-- 外观主题 -->
      <el-card class="card">
        <template #header>
          <div class="card-header-row">
            <span class="card-title"><el-icon><Sunny /></el-icon>外观</span>
            <el-switch
              v-model="isDark"
              active-text="深色"
              inactive-text="浅色"
              class="theme-switch"
              :active-color="'var(--color-primary)'"
            />
          </div>
        </template>
        <p class="hint">切换界面主题，偏好会被保存在本地，下次打开自动沿用。</p>
      </el-card>

      <!-- 账户信息 -->
      <el-card v-loading="loading" class="card">
        <template #header>
          <span class="card-title"><el-icon><User /></el-icon>账户信息</span>
        </template>

        <div class="account">
          <el-avatar :size="56" class="account-avatar">{{ avatarText }}</el-avatar>
          <div class="account-meta">
            <div class="account-name">{{ userInfo?.name || '未登录' }}</div>
            <div class="account-phone">{{ maskedPhone }}</div>
          </div>
          <el-tag v-if="userInfo?.isNewUser" type="warning" size="small">待设置密码</el-tag>
        </div>

        <el-form label-width="72px" class="profile-form" @submit.prevent="saveName">
          <el-form-item label="昵称">
            <el-input
              v-model="name"
              maxlength="20"
              show-word-limit
              placeholder="请输入昵称"
              @keyup.enter="saveName"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :loading="saving"
              :disabled="!canSave"
              @click="saveName"
            >
              保存昵称
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 服务信息 -->
      <el-card class="card">
        <template #header>
          <span class="card-title"><el-icon><Connection /></el-icon>服务信息</span>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="接口地址">{{ apiBaseUrl }}</el-descriptions-item>
          <el-descriptions-item label="AI 模型">多模型路由（Ollama / DeepSeek），白名单由后端统一配置</el-descriptions-item>
          <el-descriptions-item label="会话存储">MySQL 持久化 + Redis 热缓存，历史消息支持游标分页</el-descriptions-item>
        </el-descriptions>
        <p class="hint">
          接口地址取自 <code>.env</code> 的 <code>VITE_API_BASE_URL</code>；模型与密钥由后端管理，前端不再单独保存。
        </p>
      </el-card>

      <!-- 其他 -->
      <el-card class="card">
        <template #header>
          <span class="card-title"><el-icon><MoreFilled /></el-icon>其他</span>
        </template>
        <div class="actions">
          <el-button @click="router.push('/history')">
            <el-icon><Clock /></el-icon>
            对话历史
          </el-button>
          <el-button type="danger" plain :loading="loggingOut" @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Clock, SwitchButton, Sunny, User, Connection, MoreFilled } from '@element-plus/icons-vue'
import { getUserInfo, updateProfile, logout } from '@/api/user'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()

const userInfo = ref(null)
const name = ref('')
const loading = ref(false)
const saving = ref(false)
const loggingOut = ref(false)

const { isDark } = useTheme()

// 开发环境走 Vite 代理，生产环境走 nginx 同源反代（前端请求固定是 /api）
const apiBaseUrl = import.meta.env.DEV
  ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}（Vite 代理）`
  : `${window.location.origin}/api（同源反代）`

const avatarText = computed(() => userInfo.value?.name?.charAt(0) || 'U')

const maskedPhone = computed(() => {
  const phone = userInfo.value?.phone || ''
  return /^\d{11}$/.test(phone)
    ? phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
    : phone
})

const canSave = computed(() => {
  const trimmed = name.value.trim()
  return trimmed.length > 0 && trimmed !== (userInfo.value?.name || '')
})

const loadUser = async () => {
  loading.value = true
  try {
    const res = await getUserInfo()
    if (res.code === 200) {
      userInfo.value = res.data
      name.value = res.data?.name || ''
      localStorage.setItem('loginUser', JSON.stringify(res.data))
    }
  } catch (error) {
    console.error('加载用户信息失败', error)
    ElMessage.error(error?.message || '加载用户信息失败')
  } finally {
    loading.value = false
  }
}

const saveName = async () => {
  const trimmed = name.value.trim()
  if (!trimmed || saving.value) return

  if (trimmed.length > 20) {
    ElMessage.warning('昵称不能超过 20 个字符')
    return
  }

  saving.value = true
  try {
    await updateProfile(trimmed)
    userInfo.value = { ...userInfo.value, name: trimmed }
    name.value = trimmed
    localStorage.setItem('loginUser', JSON.stringify(userInfo.value))
    ElMessage.success('昵称已更新')
  } catch (error) {
    ElMessage.error(error?.message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
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
    // 后端 Token 可能已失效，本地照样清理
    console.error('登出接口失败', error)
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('loginUser')
    loggingOut.value = false
    ElMessage.success('已退出登录')
    router.push('/login')
  }
}

onMounted(loadUser)
</script>

<style scoped>
.settings-page {
  height: 100%;
  overflow-y: auto;
  background: var(--bg-base);
  padding: 24px;
  box-sizing: border-box;
}

.page-header {
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border-subtle);
}

.back-btn {
  color: var(--text-secondary);
  border-radius: 10px;
  padding: 8px 12px;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--bg-surface-soft);
  color: var(--color-primary);
}

.title-block h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.title-block .subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-tertiary);
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}

.card {
  background: var(--bg-surface) !important;
  border: 1px solid var(--border-subtle) !important;
  border-radius: 16px !important;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  border-color: var(--color-primary-soft) !important;
  box-shadow: var(--shadow-md);
}

.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-title .el-icon {
  color: var(--color-primary);
}

.theme-switch {
  --el-switch-on-color: var(--color-primary);
}

.account {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.account-avatar {
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  font-size: 22px;
  color: #fff;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
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
  margin-top: 4px;
}

.profile-form {
  max-width: 420px;
}

.hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.6;
}

.hint code {
  background: var(--code-inline-bg);
  color: var(--code-inline-text);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

:deep(.el-card__header) {
  padding: 16px 20px;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-descriptions__label) {
  color: var(--text-tertiary) !important;
}

:deep(.el-descriptions__content) {
  color: var(--text-primary) !important;
}

:deep(.el-descriptions__cell) {
  border-color: var(--border-subtle) !important;
}

:deep(.el-descriptions__title) {
  color: var(--text-primary);
}

:deep(.el-descriptions) {
  --el-descriptions-item-bordered-label-background: var(--bg-surface-soft);
}

:deep(.el-descriptions__body) {
  background: var(--bg-surface);
}

@media (max-width: 768px) {
  .settings-page {
    padding: 18px;
  }
}
</style>