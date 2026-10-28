<template>
  <div class="chat-input">
    <div class="composer" :class="{ focused: inputFocused }">
      <div class="composer-toolbar">
        <div v-if="showModelSelector" class="model-selector">
          <el-icon class="model-icon"><MagicStick /></el-icon>
          <el-select
            :model-value="selectedModel"
            :teleported="false"
            :placeholder="modelLocked ? '已锁定' : '默认模型'"
            :disabled="modelLocked"
            class="model-select"
            size="small"
            @update:model-value="emit('update:selectedModel', $event)"
          >
            <el-option
              v-for="model in modelOptions"
              :key="model"
              :label="model"
              :value="model"
            />
          </el-select>
          <span v-if="modelLocked" class="model-hint locked">
            <el-icon><Lock /></el-icon>
            会话已锁定
          </span>
        </div>
        <div class="composer-meta">
          <span class="composer-shortcut">Enter 发送 · Shift + Enter 换行</span>
          <span class="composer-count" :class="{ over: overLimit }">
            {{ modelValue.length }} / {{ maxLength }}
          </span>
        </div>
      </div>
      <div class="composer-body">
        <el-input
          :model-value="modelValue"
          type="textarea"
          :rows="3"
          placeholder="输入消息，开始新的对话..."
          :autosize="{ minRows: 3, maxRows: 8 }"
          class="message-input"
          autocomplete="off"
          @update:model-value="emit('update:modelValue', $event)"
          @keydown.enter="onEnterKey"
          @focus="inputFocused = true"
          @blur="inputFocused = false"
        />
        <el-button
          v-if="!isTyping"
          type="primary"
          class="send-btn"
          :disabled="!canSend"
          @click="emit('send')"
        >
          <el-icon><Promotion /></el-icon>
          <span class="btn-label">发送</span>
        </el-button>
        <el-button
          v-else
          type="danger"
          class="stop-btn"
          @click="emit('stop')"
        >
          <el-icon><VideoPause /></el-icon>
          <span class="btn-label">停止</span>
        </el-button>
      </div>
      <div v-if="overLimit" class="input-limit-tip">
        消息不能超过 {{ maxLength }} 个字符（当前 {{ modelValue.length }}）
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { MagicStick, Lock, Promotion, VideoPause } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  selectedModel: { type: String, default: '' },
  modelOptions: { type: Array, default: () => [] },
  modelLocked: { type: Boolean, default: false },
  isTyping: { type: Boolean, default: false },
  maxLength: { type: Number, default: 8000 }
})

const emit = defineEmits(['update:modelValue', 'update:selectedModel', 'send', 'stop'])

const inputFocused = ref(false)
const showModelSelector = computed(() => props.modelOptions.length >= 2)
const overLimit = computed(() => props.modelValue.length > props.maxLength)
const canSend = computed(() => !!props.modelValue.trim() && !overLimit.value)

const onEnterKey = (event) => {
  if (event.shiftKey || event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  if (!props.isTyping && canSend.value) emit('send')
}
</script>

<style scoped>
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

@media (max-width: 768px) {
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

  .send-btn,
  .stop-btn {
    width: 42px;
    padding: 0;
  }

  .send-btn .btn-label,
  .stop-btn .btn-label {
    display: none;
  }
}
</style>
