<template>
  <div class="login-container">
    <div class="login-box">
      <h2 class="login-title">AI Chat</h2>

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
          <el-icon><InfoFilled /></el-icon>
          <div>
            <div>首次登录，请设置密码（需要重新获取一次验证码）</div>
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
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { InfoFilled, Iphone, Message, Lock } from '@element-plus/icons-vue'
import {
  sendVerificationCode,
  loginWithCode,
  loginWithPassword,
  setPassword,
  getUserInfo
} from '@/api/user'

const router = useRouter()
const loading = ref(false)
const currentStep = ref(1)
const countdown = ref(0)
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

      // 获取 /user/me，v5.0 会返回 isNewUser
      const meRes = await getUserInfo()
      if (meRes.code !== 200) {
        ElMessage.error(meRes.message || '获取用户信息失败')
        return
      }

      const userInfo = meRes.data
      localStorage.setItem('loginUser', JSON.stringify(userInfo))

      // 新用户需要设置密码；老用户直接进入
      if (userInfo.isNewUser === true) {
        currentStep.value = 2
        // 刚用掉的验证码还在 60 秒冷却期，冷却结束后用户再点“重新发送”
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

// 为设置密码重新发送验证码
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
    // 后端返回“过于频繁”时同步一下倒计时，避免连续点击
    if (error?.message?.includes('频繁')) startCountdown()
  }
}

// 设置密码并进入
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
      // 设置密码后后端会清除 isNewUser 标记，同步刷新本地用户信息
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

// 密码登录
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

// 发送验证码
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
  currentStep.value = 3
}

const switchToCodeLogin = () => {
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 420px;
  padding: 40px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.login-title {
  text-align: center;
  margin-bottom: 32px;
  font-size: 28px;
  color: #303133;
  font-weight: 600;
}

.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e4e7ed;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.step.active .step-number {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.step.completed .step-number {
  background: #67c23a;
  color: #fff;
}

.step-text {
  font-size: 12px;
  color: #909399;
}

.step.active .step-text {
  color: #667eea;
  font-weight: 500;
}

.step-line {
  width: 60px;
  height: 2px;
  background: #e4e7ed;
  margin: 0 8px;
  margin-bottom: 20px;
  transition: all 0.3s;
}

.step-line.active {
  background: #67c23a;
}

.login-form {
  width: 100%;
}

.code-input-wrapper {
  display: flex;
  gap: 12px;
  width: 100%;
}

.code-input-wrapper :deep(.el-form-item__content) {
  display: flex;
  gap: 12px;
  width: 100%;
}

.code-input-wrapper :deep(.el-input) {
  flex: 1;
}

.send-code-btn {
  white-space: nowrap;
  height: 40px;
  padding: 0 16px;
}

.login-btn {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
}

.login-btn:hover {
  opacity: 0.9;
}

.step-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f0f9ff;
  border-radius: 8px;
  margin-bottom: 20px;
  color: #409eff;
  font-size: 14px;
}

.step-tip-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.login-method-switch {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #606266;
}

.login-method-switch .el-button {
  padding: 0;
}
</style>
