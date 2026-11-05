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

      <!-- MindButler 管理 -->
      <el-card class="card">
        <template #header>
          <span class="card-title"><el-icon><Connection /></el-icon>MindButler · 记忆与任务</span>
        </template>
        <div class="mb-tabs">
          <el-button-group size="small">
            <el-button :type="mbTab === 'tasks' ? 'primary' : 'default'" @click="mbTab = 'tasks'">任务</el-button>
            <el-button :type="mbTab === 'memories' ? 'primary' : 'default'" @click="mbTab = 'memories'">记忆</el-button>
          </el-button-group>
        </div>

        <!-- 任务 tab -->
        <div v-if="mbTab === 'tasks'" v-loading="mbLoading" class="mb-panel">
          <div class="mb-panel-header">
            <span class="mb-panel-title">我的任务（{{ mbTaskFilter }}）</span>
            <el-button size="small" @click="mbLoadTasks">刷新</el-button>
          </div>
          <div v-if="mbTasks.length === 0" class="mb-empty">暂无任务</div>
          <div v-else class="mb-list">
            <div v-for="task in mbTasks" :key="task.id" :class="['mb-row', task.overdue ? 'mb-row-overdue' : '']">
              <div class="mb-row-main">
                <div class="mb-row-title">{{ task.title }}</div>
                <div class="mb-row-meta">
                  <span v-if="task.dueAt">{{ formatMbDate(task.dueAt) }}</span>
                  <el-tag v-if="task.recurrence && task.recurrence !== 'once'" size="small" type="info" effect="plain">{{ mbRecurrence(task.recurrence) }}</el-tag>
                  <el-tag v-if="task.overdue" size="small" type="danger" effect="light">已逾期</el-tag>
                  <el-tag size="small" :type="task.status === 'done' ? 'success' : task.status === 'cancelled' ? 'info' : 'warning'" effect="light">{{ mbStatus(task.status) }}</el-tag>
                  <el-tag v-if="task.createdFromSession" size="small" type="info" effect="plain" :title="'发起会话：' + task.createdFromSession">会话创建</el-tag>
                </div>
              </div>
              <div class="mb-row-actions">
                <el-button v-if="task.status === 'pending'" size="small" type="primary" link :loading="mbActing === `t${task.id}`" @click="mbCompleteTask(task)">完成</el-button>
                <el-button size="small" type="danger" link :loading="mbActing === `td${task.id}`" @click="mbDeleteTask(task)">删除</el-button>
              </div>
            </div>
          </div>
          <div class="mb-filter">
            <el-radio-group v-model="mbTaskFilter" size="small" @change="mbLoadTasks">
              <el-radio-button value="pending">待办</el-radio-button>
              <el-radio-button value="done">已完成</el-radio-button>
              <el-radio-button value="cancelled">已取消</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <!-- 记忆 tab -->
        <div v-if="mbTab === 'memories'" v-loading="mbLoading" class="mb-panel">
          <div class="mb-panel-header">
            <span class="mb-panel-title">生效记忆（{{ mbMemories.length }}）</span>
            <el-button size="small" @click="mbLoadMemories">刷新</el-button>
          </div>
          <div v-if="mbMemories.length === 0" class="mb-empty">暂无记忆</div>
          <div v-else class="mb-list">
            <div v-for="mem in mbMemories" :key="mem.id" class="mb-row">
              <div class="mb-row-main">
                <div class="mb-row-title">{{ mem.content }}</div>
                <div class="mb-row-meta">
                  <el-tag size="small" type="info" effect="plain">{{ mem.memKey }}</el-tag>
                  <el-tag v-if="mem.memType" size="small" effect="plain">{{ mem.memType }}</el-tag>
                  <el-tag v-if="mem.scope === 'session' || mem.sessionId" size="small" type="warning" effect="plain" :title="mem.scope === 'session' || mem.sessionId ? '仅本会话生效' : ''">会话级</el-tag>
                  <el-tag v-else size="small" effect="plain">全局</el-tag>
                  <el-tag size="small" :type="mem.status === 'active' ? 'success' : 'info'" effect="light">{{ mem.status }}</el-tag>
                  <span v-if="mem.expiresAt">到期 {{ formatMbDate(mem.expiresAt) }}</span>
                </div>
              </div>
              <div class="mb-row-actions">
                <el-button size="small" type="danger" link :loading="mbActing === `m${mem.id}`" @click="mbDeleteMemory(mem)">删除</el-button>
              </div>
            </div>
          </div>
        </div>
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
import { getUserInfo, updateProfile, logout, getTasks, completeTask, deleteTask, getMemories, deleteMemory, getTask } from '@/api/user'
import { useTheme } from '@/composables/useTheme'
import { formatDueAt } from '@/utils/pending'

const router = useRouter()

const userInfo = ref(null)
const name = ref('')
const loading = ref(false)
const saving = ref(false)
const loggingOut = ref(false)

// ==================== MindButler 管理 ====================
const mbTab = ref('tasks')
const mbLoading = ref(false)
const mbActing = ref(null)
const mbTasks = ref([])
const mbMemories = ref([])
const mbTaskFilter = ref('pending')

const formatMbDate = (val) => {
  // 后端返回的是无时区 LocalDateTime 字符串，用字面量解析避免浏览器当 UTC 偏移 8 小时
  return formatDueAt(val, { compact: true })
}
const mbRecurrence = (r) => ({ daily: '每日', weekly: '每周', monthly: '每月', once: '单次' }[r] || r)
const mbStatus = (s) => ({ pending: '待办', done: '已完成', cancelled: '已取消' }[s] || s)

const mbLoadTasks = async () => {
  mbLoading.value = true
  try {
    const res = await getTasks(mbTaskFilter.value)
    mbTasks.value = res.code === 200 ? (res.data || []) : []
  } catch (e) {
    console.error('加载任务失败', e)
    mbTasks.value = []
  } finally {
    mbLoading.value = false
  }
}

const mbLoadMemories = async () => {
  mbLoading.value = true
  try {
    // 记忆面板是"管理我所有记忆"的入口，拉全量（不传 sessionId）。
    // 会话级记忆的隔离在后端 QUERY 意图里做；这里若带 localStorage 的 currentSessionId，
    // 各设备本地生成的会话 id 不同，会导致同账号跨设备面板数据不一致。
    const res = await getMemories(100)
    mbMemories.value = res.code === 200 ? (res.data || []) : []
  } catch (e) {
    console.error('加载记忆失败', e)
    mbMemories.value = []
  } finally {
    mbLoading.value = false
  }
}

const mbCompleteTask = async (task) => {
  mbActing.value = `t${task.id}`
  try {
    // 列表接口不保证返回 version；乐观锁 409 时先拉单条任务拿最新 version 再完成
    let version = task.version
    if (version == null) {
      const detail = await getTask(task.id)
      if (detail.code === 200 && detail.data) {
        version = detail.data.version
      }
    }
    const res = await completeTask(task.id, version)
    if (res.code === 200) {
      ElMessage.success(task.recurrence === 'once' ? '任务已完成' : '已滚动到下一次')
      mbLoadTasks()
    } else {
      ElMessage.warning(res.message || '操作失败')
    }
  } catch (e) {
    // 409 多为版本过期，刷新任务列表即可
    if (e?.code === 409) {
      ElMessage.warning('任务状态已变化，请刷新后重试')
      mbLoadTasks()
    } else {
      ElMessage.error(e?.message || '操作失败')
    }
  } finally {
    mbActing.value = null
  }
}

const mbDeleteTask = async (task) => {
  mbActing.value = `td${task.id}`
  try {
    await deleteTask(task.id)
    ElMessage.success('任务已删除')
    mbLoadTasks()
  } catch (e) {
    ElMessage.error(e?.message || '删除失败')
  } finally {
    mbActing.value = null
  }
}

const mbDeleteMemory = async (mem) => {
  mbActing.value = `m${mem.id}`
  try {
    await deleteMemory(mem.id)
    ElMessage.success('记忆已删除')
    mbLoadMemories()
  } catch (e) {
    ElMessage.error(e?.message || '删除失败')
  } finally {
    mbActing.value = null
  }
}

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

onMounted(() => {
  loadUser()
  mbLoadTasks()
  mbLoadMemories()
})
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

.mb-tabs {
  margin-bottom: 14px;
}

.mb-panel {
  min-height: 60px;
}

.mb-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.mb-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.mb-empty {
  padding: 28px 0;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

.mb-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  background: var(--bg-surface-soft);
  transition: all 0.2s ease;
}

.mb-row:hover {
  border-color: var(--color-primary-soft);
  box-shadow: var(--shadow-sm);
}

.mb-row-overdue {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.05);
}

.mb-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.mb-row-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mb-row-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--text-tertiary);
}

.mb-row-actions {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
}

.mb-filter {
  margin-top: 12px;
  display: flex;
  justify-content: center;
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