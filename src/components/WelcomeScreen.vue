<template>
  <div class="empty-state">
    <div class="empty-icon-wrap">
      <div class="empty-icon-glow"></div>
      <div class="empty-icon">
        <el-icon :size="64"><ChatDotRound /></el-icon>
      </div>
    </div>
    <span class="empty-eyebrow">AI CHAT · MULTI-MODEL</span>
    <h2>你好，有什么可以帮你的？</h2>
    <p>支持 Markdown、代码高亮与多模型切换</p>

    <div class="quick-questions">
      <div
        v-for="(question, index) in questions"
        :key="index"
        class="quick-question"
        @click="emit('select', question)"
      >
        <el-icon><Document /></el-icon>
        <span>{{ question }}</span>
        <el-icon class="quick-arrow"><ArrowRight /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ChatDotRound, Document, ArrowRight } from '@element-plus/icons-vue'

defineProps({
  questions: { type: Array, default: () => [] }
})

const emit = defineEmits(['select'])
</script>

<style scoped>
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

@media (max-width: 768px) {
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
}
</style>
