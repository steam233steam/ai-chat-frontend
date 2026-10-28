<template>
  <div class="login-container">
    <div class="login-blob login-blob-1"></div>
    <div class="login-blob login-blob-2"></div>

    <el-button class="login-theme-btn" circle :title="isDark ? '切换为浅色' : '切换为深色'" @click="toggle">
      <el-icon><Sunny v-if="isDark" /><Moon v-else /></el-icon>
    </el-button>

    <div class="login-box login-box-enter">
      <div class="login-logo">
        <el-icon :size="28" color="var(--color-primary)"><ChatDotRound /></el-icon>
      </div>
      <h2 class="login-title">
        <span class="shiny-text">AI Chat</span>
      </h2>
      <p class="login-subtitle">欢迎回来，开始你的智能对话</p>

      <!-- 步骤指示器 -->
      <div class="steps">
        <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
          <span class="step-number">1</span>
          <span class="step-text">验证身份</span>
        </div>
        <div class="step-line" :class="{ active: currentStep > 1 }"></div>
        <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
          <span class="step-number">2</span>
          <span class="step-text">设置密码</span>
        </div>
        <div class="step-line" :class="{ active: currentStep > 2 }"></div>
        <div class="step" :class="{ active: currentStep >= 3 }">
          <span class="step-number">3</span>
          <span class="step-text">登录</span>
        </div>
      </div>

      <!-- 步骤切换过渡 -->
      <Transition :name="stepTransition" mode="out-in">
        <!-- 步骤1: 手机号 + 验证码登录 -->
        <el-form
          v-if="currentStep === 1"
          ref="phoneFormRef"
          :model="phoneForm"
          :rules="phoneRules"
          class="login-form"
          autocomplete="off"
        >
          <el-form-item prop="phone">
            <el-input
              v-model="phoneForm.phone"
              placeholder="请输入手机号"
              :prefix-icon="Iphone"
              maxlength="11"
              autocomplete="off"
              size="large"
            />
          </el-form-item>

          <el-form-item prop="code">
            <div class="code-input-wrapper">
              <el-input
                v-model="phoneForm.code"
                placeholder="请输入验证码"
                :prefix-icon="Message"
                maxlength="6"
                autocomplete="off"
                size="large"
              />
              <el-button
                :disabled="countdown > 0"
                @click="sendCode"
                class="send-code-btn"
              >
                {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
              </el-button>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              class="login-btn"
              :loading="loading"
              @click="verifyPhone"
            >
              下一步
            </el-button>
          </el-form-item>

          <div class="login-method-switch">
            <span>已有账号？</span>
            <el-button link @click="switchToPasswordLogin">密码登录</el-button>
          </div>
        </el-form>

        <!-- 步骤2: 新用户设置密码 -->
        <el-form
          v-else-if="currentStep === 2"
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          class="login-form"
          autocomplete="off"
        >
          <div class="step-tip">
            <el-icon :size="18"><InfoFilled /></el-icon>
            <div>
              <div>首次登录，请设置密码（需重新获取一次验证码）</div>
              <div class="step-tip-sub">
                {{ countdown > 0 ? `${countdown} 秒后可重新获取验证码` : '点击右侧“重新发送”获取验证码' }}
              </div>
            </div>
          </div>

          <el-form-item prop="code">
            <div class="code-input-wrapper">
              <el-input
                v-model="passwordForm.code"
                placeholder="请输入新验证码"
                :prefix-icon="Message"
                maxlength="6"
                autocomplete="off"
                size="large"
              />
              <el-button
                :disabled="countdown > 0"
                @click="sendCodeForPassword"
                class="send-code-btn"
              >
                {{ countdown > 0 ? `${countdown}s` : '重新发送' }}
              </el-button>
            </div>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="passwordForm.password"
              type="password"
              placeholder="请输入密码（4-32位字母/数字/下划线）"
              :prefix-icon="Lock"
              show-password
              autocomplete="new-password"
              size="large"
            />
          </el-form-item>

          <el-form-item prop="confirmPassword">
            <el-input
              v-model="passwordForm.confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              :prefix-icon="Lock"
              show-password
              autocomplete="new-password"
              size="large"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              class="login-btn"
              :loading="loading"
              @click="setPasswordAndLogin"
            >
              设置并登录
            </el-button>
          </el-form-item>

          <div class="login-method-switch">
            <el-button link @click="currentStep = 1">返回</el-button>
          </div>
        </el-form>

        <!-- 步骤3: 密码登录 -->
        <el-form
          v-else-if="currentStep === 3"
          ref="passwordLoginFormRef"
          :model="passwordLoginForm"
          :rules="passwordLoginRules"
          class="login-form"
          autocomplete="off"
        >
          <el-form-item prop="phone">
            <el-input
              v-model="passwordLoginForm.phone"
              placeholder="请输入手机号"
              :prefix-icon="Iphone"
              maxlength="11"
              autocomplete="off"
              size="large"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="passwordLoginForm.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              show-password
              autocomplete="current-password"
              size="large"
              @keyup.enter="handlePasswordLogin"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              class="login-btn"
              :loading="loading"
              @click="handlePasswordLogin"
            >
              登录
            </el-button>
          </el-form-item>

          <div class="login-method-switch">
            <span>没有账号？</span>
            <el-button link @click="switchToCodeLogin">验证码登录</el-button>
          </div>
        </el-form>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { ElMessage } from 'element-plus'
import { InfoFilled, Iphone, Message, Lock, ChatDotRound, Sunny, Moon } from '@element-plus/icons-vue'
import {
  sendVerificationCode,
  loginWithCode,
  loginWithPassword,
  setPassword,
  getUserInfo
} from '@/api/user'

const router = useRouter()
const { isDark, toggle } = useTheme()
const loading = ref(false)
const currentStep = ref(1)
const countdown = ref(0)
const stepTransition = ref('step-slide-left')
let timer = null

const phoneFormRef = ref()
const passwordFormRef = ref()
const passwordLoginFormRef = ref()

const phoneForm = reactive({
  phone: '',
  code: ''
})

const passwordForm = reactive({
  phone: '',
  code: '',
  password: '',
  confirmPassword: ''
})

const passwordLoginForm = reactive({
  phone: '',
  password: ''
})

const phoneRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
  ]
}

const passwordRules = {
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_]{4,32}$/, message: '密码需为4-32位字母、数字或下划线', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const passwordLoginRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const startCountdown = () => {
  countdown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

// 验证手机号并登录
const verifyPhone = async () => {
  if (!phoneFormRef.value) return
  await phoneFormRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const res = await loginWithCode(phoneForm.phone, phoneForm.code)
      if (res.code !== 200) {
        ElMessage.error(res.message || '验证码错误或已过期')
        return
      }

      const token = res.data
      localStorage.setItem('token', token)
      passwordForm.phone = phoneForm.phone
      passwordForm.code = ''

      const meRes = await getUserInfo()
      if (meRes.code !== 200) {
        ElMessage.error(meRes.message || '获取用户信息失败')
        return
      }

      const userInfo = meRes.data
      localStorage.setItem('loginUser', JSON.stringify(userInfo))

      if (userInfo.isNewUser === true) {
        stepTransition.value = 'step-slide-left'
        currentStep.value = 2
        sendCodeForPassword({ silent: true })
      } else {
        ElMessage.success('登录成功')
        router.push('/chat')
      }
    } catch (error) {
      console.error('登录失败', error)
      ElMessage.error(error?.message || '登录失败，请稍后重试')
    } finally {
      loading.value = false
    }
  })
}

const sendCodeForPassword = async ({ silent = false } = {}) => {
  if (!passwordForm.phone) return

  if (countdown.value > 0) {
    if (!silent) ElMessage.warning(`验证码已发送，请 ${countdown.value} 秒后再试`)
    return
  }

  try {
    const res = await sendVerificationCode(passwordForm.phone)
    if (res.code === 200) {
      ElMessage.success('验证码已重新发送')
      startCountdown()
    } else {
      ElMessage.warning(res.message || '发送失败')
    }
  } catch (error) {
    ElMessage.warning(error?.message || '验证码发送失败，请稍后重试')
    if (error?.message?.includes('频繁')) startCountdown()
  }
}

const setPasswordAndLogin = async () => {
  if (!passwordFormRef.value) return
  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const res = await setPassword(passwordForm.phone, passwordForm.code, passwordForm.password)
      if (res.code !== 200) {
        ElMessage.error(res.message || '设置密码失败')
        return
      }
      try {
        const meRes = await getUserInfo()
        if (meRes.code === 200) {
          localStorage.setItem('loginUser', JSON.stringify(meRes.data))
        }
      } catch (_) {
        // 刷新失败不影响进入聊天页
      }

      ElMessage.success('密码设置成功，已登录')
      router.push('/chat')
    } catch (error) {
      ElMessage.error(error?.message || '密码设置失败，请稍后重试')
    } finally {
      loading.value = false
    }
  })
}

const handlePasswordLogin = async () => {
  if (!passwordLoginFormRef.value) return
  await passwordLoginFormRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const res = await loginWithPassword(passwordLoginForm.phone, passwordLoginForm.password)
      if (res.code !== 200) {
        ElMessage.error(res.message || '登录失败')
        return
      }
      localStorage.setItem('token', res.data)

      const meRes = await getUserInfo()
      if (meRes.code === 200) {
        localStorage.setItem('loginUser', JSON.stringify(meRes.data))
      }

      ElMessage.success('登录成功')
      router.push('/chat')
    } catch (error) {
      ElMessage.error(error?.message || '登录失败，请稍后重试')
    } finally {
      loading.value = false
    }
  })
}

const sendCode = async () => {
  if (!phoneForm.phone) {
    ElMessage.warning('请输入手机号')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(phoneForm.phone)) {
    ElMessage.warning('手机号格式不正确')
    return
  }
  try {
    const res = await sendVerificationCode(phoneForm.phone)
    if (res.code === 200) {
      ElMessage.success('验证码已发送')
      startCountdown()
    } else {
      ElMessage.warning(res.message || '发送失败')
    }
  } catch (error) {
    ElMessage.warning(error?.message || '验证码发送失败，请稍后重试')
    if (error?.message?.includes('频繁')) startCountdown()
  }
}

const switchToPasswordLogin = () => {
  stepTransition.value = 'step-slide-left'
  currentStep.value = 3
}

const switchToCodeLogin = () => {
  stepTransition.value = 'step-slide-right'
  currentStep.value = 1
}

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
  background: var(--bg-base);
  position: relative;
  overflow: hidden;
}

/* 背景渐变光斑 */
.login-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.55;
  pointer-events: none;
}

.login-blob-1 {
  width: 480px;
  height: 480px;
  top: -120px;
  left: -80px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.4), transparent 60%);
}

.login-blob-2 {
  width: 520px;
  height: 520px;
  bottom: -160px;
  right: -100px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.38), transparent 60%);
}

.login-theme-btn {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 2;
  width: 40px;
  height: 40px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  color: var(--text-secondary);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.login-theme-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary-soft);
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow);
}

.login-box {
  width: 440px;
  max-width: 92vw;
  padding: 44px 40px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: var(--shadow-lg);
  position: relative;
  z-index: 1;
}

.login-box-enter {
  animation: loginBoxIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes loginBoxIn {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.login-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.login-logo :deep(.el-icon) {
  animation: logoFloat 3s ease-in-out infinite;
}

@keyframes logoFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.login-title {
  text-align: center;
  font-size: 30px;
  font-weight: 700;
  margin: 0 0 6px;
}

.login-subtitle {
  text-align: center;
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 0 0 28px;
}

/* 步骤指示器 */
.steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-bottom: 28px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-number {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--bg-surface-soft);
  border: 1.5px solid var(--border-subtle);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.step.active .step-number {
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
  transform: scale(1.08);
}

.step.completed .step-number {
  background: var(--color-success);
  border-color: transparent;
  color: #fff;
}

.step-text {
  font-size: 12px;
  color: var(--text-tertiary);
  transition: color 0.3s;
}

.step.active .step-text {
  color: var(--color-primary);
  font-weight: 600;
}

.step-line {
  width: 52px;
  height: 2px;
  background: var(--border-subtle);
  margin: 0 8px;
  margin-bottom: 24px;
  transition: all 0.4s;
}

.step-line.active {
  background: var(--color-success);
}

.login-form {
  width: 100%;
}

.code-input-wrapper {
  display: flex;
  gap: 10px;
  width: 100%;
}

.code-input-wrapper :deep(.el-input) {
  flex: 1;
}

.send-code-btn {
  white-space: nowrap;
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
}

.login-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
  border: none;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
  transition: all 0.25s;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(99, 102, 241, 0.55);
}

.login-btn:disabled {
  opacity: 0.5;
  box-shadow: none;
}

.step-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  background: rgba(var(--color-primary-rgb), 0.08);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  border-radius: 12px;
  margin-bottom: 20px;
  color: var(--color-primary-strong);
  font-size: 14px;
}

.step-tip-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.login-method-switch {
  text-align: center;
  margin-top: 18px;
  font-size: 14px;
  color: var(--text-secondary);
}

.login-method-switch .el-button {
  padding: 0;
  color: var(--color-primary);
  font-weight: 500;
}

/* 步骤切换过渡 */
.step-slide-left-enter-active,
.step-slide-left-leave-active,
.step-slide-right-enter-active,
.step-slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.step-slide-left-enter-from {
  opacity: 0;
  transform: translateX(28px);
}

.step-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-28px);
}

.step-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-28px);
}

.step-slide-right-leave-to {
  opacity: 0;
  transform: translateX(28px);
}

/* 输入框样式跟随主题 */
:deep(.el-input__wrapper) {
  background: var(--bg-surface-soft) !important;
  box-shadow: 0 0 0 1px var(--border-subtle) inset !important;
  border-radius: 10px;
  transition: all 0.2s;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px var(--color-primary) inset !important;
}
</style>
