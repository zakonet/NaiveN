<script setup lang="ts">
import { computed } from 'vue'
import { VueDraggable, type DraggableEvent } from 'vue-draggable-plus'
import { GridOutline, LayersOutline, OptionsOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui/es/icon'

import type { SchemaNode, SchemaStyle } from '../core/types'
import ComponentRenderer from '../renderer/ComponentRenderer.vue'
import { useBuilderStore } from '../stores/builder'

const emit = defineEmits<{
  select: [id: string]
  'toggle-library': []
  'toggle-inspector': []
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
  const node =
    event.clonedData ??
    (event.newIndex === undefined ? undefined : rootNodes.value[event.newIndex])
  if (node) {
    emit('select', node.id)
  }
}

function handleResize(id: string, style: SchemaStyle): void {
  store.updateNodeStyle(id, style)
}

function toggleLibrary(): void {
  emit('toggle-library')
}

function toggleInspector(): void {
  emit('toggle-inspector')
}
</script>

<template>
  <section class="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-100 dark:bg-slate-950">
    <header class="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:px-5 dark:border-slate-800 dark:bg-slate-900">
      <div class="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
          type="button"
          aria-label="Toggle component library"
          title="Toggle component library"
          @click="toggleLibrary"
        >
          <NIcon aria-hidden="true" size="17"><LayersOutline /></NIcon>
        </button>
        <div class="min-w-0">
          <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Workspace</p>
          <div class="flex items-center gap-2">
            <h2 class="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">Page canvas</h2>
            <span class="hidden border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
              {{ rootNodes.length }} root{{ rootNodes.length === 1 ? '' : 's' }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <span class="hidden items-center gap-1.5 border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 sm:flex dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          <NIcon aria-hidden="true" size="13"><GridOutline /></NIcon>
          1280 × 720
        </span>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
          type="button"
          aria-label="Toggle inspector"
          title="Toggle inspector"
          @click="toggleInspector"
        >
          <NIcon aria-hidden="true" size="17"><OptionsOutline /></NIcon>
        </button>
      </div>
    </header>

    <div class="canvas-grid min-h-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
      <div class="mx-auto flex min-h-full w-full max-w-6xl flex-col">
        <div class="mb-3 flex items-center justify-between gap-3 px-1 text-[10px] font-medium uppercase tracking-[0.13em] text-slate-400 dark:text-slate-500">
          <span>Design surface</span>
          <span class="hidden sm:inline">Drag to arrange</span>
        </div>
        <div class="relative min-h-[620px] w-full border border-slate-200 bg-white shadow-[0_16px_38px_rgb(15_23_42_/_0.10)] dark:border-slate-700 dark:bg-slate-900">
        <VueDraggable
          v-model="rootNodes"
          class="flex min-h-[620px] flex-col gap-5 p-5 sm:p-8 lg:p-10"
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
            class="flex min-h-[520px] items-center justify-center border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center dark:border-slate-700 dark:bg-slate-950/70"
          >
            <div class="max-w-64">
              <div class="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                <NIcon aria-hidden="true" size="20"><GridOutline /></NIcon>
              </div>
              <p class="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Start with a page block</p>
              <p class="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">Drag a component from the library, then shape it in the inspector.</p>
            </div>
          </div>
        </VueDraggable>
        </div>
      </div>
    </div>
  </section>
</template>
