<template>
  <div
    class="markdown-body streaming-md"
    :class="{ done: !streaming }"
    v-html="html"
  ></div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useTypewriter } from '@/composables/useTypewriter'
import { renderStreamingMarkdown, renderMarkdown } from '@/utils/markdown'

const props = defineProps({
  /** 完整的原始 Markdown 文本（父组件流式累积） */
  content: { type: String, default: '' },
  /** 是否还在流式输出中（父组件在流结束/停止时置为 false） */
  streaming: { type: Boolean, default: true }
})

// 打字机引擎：30fps 吐字，已定型前缀（stable）渲染一次后冻结，只重渲染最近 400 字
const tw = useTypewriter({ fps: 30, charsPerTick: 4, stableLength: 400 })

// 已喂入打字机的 content 长度（用于只喂增量，避免重复）
let fedLen = 0

// stable 前缀渲染缓存（stable 一旦定型就不再变化，避免每帧重算长文本）
const stableHtml = ref('')
const lastStable = ref('')

watch(
  () => props.content,
  (next) => {
    // 历史消息 / 已结束的消息不需要打字机，直接走最终态渲染
    if (!props.streaming) {
      fedLen = next.length
      return
    }
    if (next.length < fedLen) {
      // 内容被重置（重新生成 / 切换消息）
      tw.reset()
      fedLen = 0
    }
    if (next.length > fedLen) {
      tw.feed(next.slice(fedLen))
      fedLen = next.length
    }
  },
  { immediate: true }
)

watch(
  () => props.streaming,
  (still, wasStreaming) => {
    if (still) {
      // 理论上消息实例不会从历史态切换为流式态，这里做一次兜底：
      // 若发生，重新把已有内容喂给打字机，避免只吐增量导致前半段丢失。
      if (!wasStreaming) {
        tw.reset()
        fedLen = 0
        if (props.content) {
          tw.feed(props.content)
          fedLen = props.content.length
        }
      }
      return
    }
    // 流结束：立即吐完缓冲；最终态由 html 直接使用完整 content
    tw.flush()
    lastStable.value = tw.stable.value
    stableHtml.value = ''
  },
  { immediate: true }
)

// stable 变化时只渲染一次；stable 被重置为空时也要清缓存，否则会残留旧 HTML
watch(
  () => tw.stable.value,
  (stable) => {
    if (stable === lastStable.value) return
    stableHtml.value = stable ? renderMarkdown(stable) : ''
    lastStable.value = stable
  },
  { immediate: true }
)

const html = computed(() => {
  if (!props.streaming) {
    // 最终态：渲染完整 content（历史消息也走这里）
    return renderMarkdown(props.content)
  }
  // 流式中：已定型前缀 + 未定型尾巴（尾巴做流式感知渲染，未闭合代码块不闪烁）
  return stableHtml.value + renderStreamingMarkdown(tw.frontier.value)
})

defineExpose({ html })
</script>

<style scoped>
.streaming-md {
  font-size: 15px;
  line-height: 1.75;
  word-break: break-word;
}

/* 正在打字时末尾的呼吸光标 */
.streaming-md:not(.done)::after {
  content: '';
  display: inline-block;
  width: 8px;
  height: 14px;
  margin-left: 3px;
  background: var(--color-primary);
  animation: streamPulse 1.1s ease-in-out infinite;
  vertical-align: text-bottom;
}

@keyframes streamPulse {
  0%,
  100% {
    opacity: 0.2;
    transform: scaleY(0.85);
  }
  50% {
    opacity: 1;
    transform: scaleY(1);
  }
}
</style>
