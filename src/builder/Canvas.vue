<script setup lang="ts">
import { computed } from 'vue'
import { VueDraggable, type DraggableEvent } from 'vue-draggable-plus'

import type { SchemaNode, SchemaStyle } from '../core/types'
import ComponentRenderer from '../renderer/ComponentRenderer.vue'
import { useBuilderStore } from '../stores/builder'

const emit = defineEmits<{
  select: [id: string]
}>()

const store = useBuilderStore()
const rootNodes = computed<SchemaNode[]>({
  get: () => store.rootNodes.value,
  set: (nodes) => store.replaceRootNodes(nodes),
})

function handleSelect(id: string): void {
  emit('select', id)
}

function handleAdd(event: DraggableEvent<SchemaNode>): void {
  const node = event.newIndex === undefined ? undefined : rootNodes.value[event.newIndex]
  if (node) {
    emit('select', node.id)
  }
}

function handleResize(id: string, style: SchemaStyle): void {
  store.updateNodeStyle(id, style)
}
</script>

<template>
  <section class="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-100 dark:bg-slate-950">
    <div class="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <p class="text-sm font-semibold text-slate-900 dark:text-slate-50">Canvas</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">{{ rootNodes.length }} root component(s)</p>
      </div>
      <span class="border border-slate-200 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
        1280 x 720
      </span>
    </div>

    <div class="min-h-0 flex-1 overflow-auto p-6">
      <div class="mx-auto min-h-[620px] w-full max-w-5xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <VueDraggable
          v-model="rootNodes"
          class="flex min-h-[620px] flex-col gap-4 p-8"
          :group="{ name: 'naiven-components', pull: true, put: true }"
          :animation="160"
          ghost-class="sortable-ghost"
          @add="handleAdd"
        >
          <div
            v-for="node in rootNodes"
            :key="node.id"
            class="min-h-8"
            @click.stop="handleSelect(node.id)"
          >
            <ComponentRenderer
              :node="node"
              :selected-id="store.selectedNodeId.value"
              @select="handleSelect"
              @resize="handleResize"
            />
          </div>

          <div
            v-if="rootNodes.length === 0"
            class="flex min-h-[540px] items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-950"
          >
            <div>
              <p class="text-sm font-medium text-slate-700 dark:text-slate-200">Canvas is empty</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Drag a component here to start building.</p>
            </div>
          </div>
        </VueDraggable>
      </div>
    </div>
  </section>
</template>
