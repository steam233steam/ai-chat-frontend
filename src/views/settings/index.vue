<template>
  <div class="settings-page">
    <div class="page-header">
      <el-button text @click="router.push('/chat')">
        <el-icon><ArrowLeft /></el-icon>
        返回对话
      </el-button>
      <h2>设置</h2>
    </div>

    <div class="settings-body">
      <el-card v-loading="loading" class="card">
        <template #header>
          <span class="card-title">账户信息</span>
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

      <el-card class="card">
        <template #header>
          <span class="card-title">服务信息</span>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="接口地址">{{ apiBaseUrl }}</el-descriptions-item>
          <el-descriptions-item label="AI 模型">服务端 Ollama（qwen2.5-coder:7b），由后端统一配置</el-descriptions-item>
          <el-descriptions-item label="会话存储">Redis，历史记录保留 7 天</el-descriptions-item>
        </el-descriptions>
        <p class="hint">
          接口地址取自 <code>.env</code> 的 <code>VITE_API_BASE_URL</code>；模型与密钥由后端管理，前端不再单独保存。
        </p>
      </el-card>

      <el-card class="card">
        <template #header>
          <span class="card-title">其他</span>
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
import { ArrowLeft, Clock, SwitchButton } from '@element-plus/icons-vue'
import { getUserInfo, updateProfile, logout } from '@/api/user'

const router = useRouter()

const userInfo = ref(null)
const name = ref('')
const loading = ref(false)
const saving = ref(false)
const loggingOut = ref(false)

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin

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
  background: #f5f7fa;
  padding: 16px 24px 32px;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.settings-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 720px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
}

.account {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.account-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 22px;
}

.account-meta {
  flex: 1;
  min-width: 0;
}

.account-name {
  font-size: 16px;
  color: #303133;
}

.account-phone {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.profile-form {
  max-width: 420px;
}

.hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
