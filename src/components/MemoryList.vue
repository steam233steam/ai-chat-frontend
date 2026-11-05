<template>
  <div v-if="memories.length" class="memory-list">
    <div v-for="memory in memories" :key="memory.id" class="memory-item">
      <div class="memory-main">
        <div class="memory-meta">
          <span class="memory-key">{{ memoryKeyLabel(memory.memKey) }}</span>
          <span v-if="memoryTypeLabel(memory.memType)" class="memory-type">
            {{ memoryTypeLabel(memory.memType) }}
          </span>
          <span v-if="memory.expiresAt" class="memory-expiry" :title="'到期 ' + formatDueAt(memory.expiresAt)">
            至 {{ formatDueAt(memory.expiresAt, { compact: true }) }}
          </span>
        </div>
        <div class="memory-content" :title="memory.content">{{ memory.content }}</div>
      </div>
      <button
        class="memory-delete"
        :disabled="actingId === memory.id"
        title="删除这条记忆"
        @click="$emit('delete', memory)"
      >
        <el-icon><Delete /></el-icon>
      </button>
    </div>
  </div>
  <div v-else-if="emptyText" class="memory-empty">{{ emptyText }}</div>
</template>

<script setup>
import { Delete } from '@element-plus/icons-vue'
import { formatDueAt } from '@/utils/pending'
import { memoryKeyLabel, memoryTypeLabel } from '@/utils/sidebar'

defineProps({
  memories: { type: Array, default: () => [] },
  actingId: { type: [Number, String], default: null },
  emptyText: { type: String, default: '' }
})

defineEmits(['delete'])
</script>

<style scoped>
.memory-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.memory-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.045);
}

.memory-item:hover {
  border-color: rgba(129, 140, 248, 0.28);
  background: rgba(129, 140, 248, 0.08);
}

.memory-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.memory-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  min-width: 0;
}

.memory-key {
  max-width: 100%;
  padding: 0 6px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.24);
  color: rgba(255, 255, 255, 0.88);
  font-size: 9px;
  line-height: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memory-type {
  color: var(--text-sidebar-soft);
  font-size: 9px;
}

.memory-expiry {
  color: var(--text-sidebar-soft);
  font-size: 9px;
  opacity: 0.8;
}

.memory-content {
  color: var(--text-sidebar);
  font-size: 11px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.memory-delete {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-sidebar-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.16s ease;
}

.memory-item:hover .memory-delete {
  opacity: 1;
}

.memory-delete:hover {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.16);
}

.memory-delete:disabled {
  cursor: wait;
  opacity: 0.35;
}

.memory-delete .el-icon {
  font-size: 12px;
}

.memory-empty {
  padding: 8px 4px;
  color: var(--text-sidebar-soft);
  font-size: 11px;
}

@media (max-width: 768px) {
  .memory-delete {
    width: 30px;
    height: 30px;
    opacity: 1;
    background: rgba(255, 255, 255, 0.06);
  }
}
</style>
