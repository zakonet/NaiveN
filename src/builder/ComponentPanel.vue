<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import {
  ChevronBackOutline,
  ChevronForwardOutline,
  LayersOutline,
  SearchOutline,
} from '@vicons/ionicons5'
import { NIcon } from 'naive-ui/es/icon'

import { componentRegistry } from '../core/registry'
import type { ComponentPaletteItem, SchemaNode } from '../core/types'

const emit = defineEmits<{
  add: [type: string]
  close: []
}>()

const searchQuery = ref('')
const showAllComponents = ref(false)
const suppressNextClick = ref(false)
let clickResetTimer: ReturnType<typeof setTimeout> | undefined
const paletteItems = computed<ComponentPaletteItem[]>({
  get: () => {
    const query = searchQuery.value.trim().toLowerCase()
    const items = componentRegistry.listPaletteItems()

    if (!query) {
      return items
    }

    return items.filter((item) =>
      [item.type, item.label, item.description].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  },
  set: () => {},
})
const componentCount = computed(() => componentRegistry.listComponents().length)
const hasSearchQuery = computed(() => Boolean(searchQuery.value.trim()))
const featuredItems = computed(() => paletteItems.value.filter((item) => item.configured))
const visiblePaletteItems = computed<ComponentPaletteItem[]>({
  get: () => {
    if (hasSearchQuery.value || showAllComponents.value) {
      return paletteItems.value
    }

    return featuredItems.value
  },
  set: () => {},
})
const paletteSectionTitle = computed(() =>
  hasSearchQuery.value
    ? `Search results (${visiblePaletteItems.value.length})`
    : showAllComponents.value
      ? `All components (${componentCount.value})`
      : `Starter blocks (${featuredItems.value.length})`,
)

function clonePaletteItem(item: ComponentPaletteItem): SchemaNode {
  return componentRegistry.createNode(item.type)
}

function handleDragStart(): void {
  suppressNextClick.value = true

  if (clickResetTimer) {
    clearTimeout(clickResetTimer)
    clickResetTimer = undefined
  }
}

function handleDragEnd(): void {
  clickResetTimer = setTimeout(() => {
    suppressNextClick.value = false
    clickResetTimer = undefined
  })
}

function handleItemClick(type: string): void {
  if (suppressNextClick.value) {
    return
  }

  emit('add', type)
}

onBeforeUnmount(() => {
  if (clickResetTimer) {
    clearTimeout(clickResetTimer)
  }
})
</script>

<template>
  <aside class="flex min-h-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <header class="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2.5">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <NIcon aria-hidden="true" size="17"><LayersOutline /></NIcon>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Component library</p>
            <h2 class="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">Naive UI blocks</h2>
          </div>
        </div>
        <button
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          type="button"
          aria-label="Hide component library"
          title="Hide component library"
          @click="emit('close')"
        >
          <NIcon aria-hidden="true" size="16"><ChevronBackOutline /></NIcon>
        </button>
      </div>
      <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {{ componentCount }} components. Click to add, or drag on a larger canvas.
      </p>
      <label class="relative mt-3 block">
        <NIcon aria-hidden="true" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size="15">
          <SearchOutline />
        </NIcon>
        <input
          v-model="searchQuery"
          type="search"
          class="h-10 w-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
          placeholder="Search every component"
          aria-label="Search components"
        />
      </label>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-3">
      <div class="mb-3 flex items-center justify-between gap-2 px-1">
        <p class="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500 dark:text-slate-400">
          {{ paletteSectionTitle }}
        </p>
        <span v-if="!hasSearchQuery && !showAllComponents" class="text-[10px] text-slate-400 dark:text-slate-500">Curated</span>
      </div>

      <VueDraggable
        v-model="visiblePaletteItems"
        class="grid content-start gap-2"
        :group="{ name: 'naiven-components', pull: 'clone', put: false }"
        :sort="false"
        :clone="clonePaletteItem"
        item-key="type"
        ghost-class="sortable-ghost"
        @start="handleDragStart"
        @end="handleDragEnd"
      >
        <button
          v-for="item in visiblePaletteItems"
          :key="item.type"
          type="button"
          class="group flex min-h-16 flex-col items-start justify-between border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition duration-150 hover:-translate-y-px hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-500 dark:hover:bg-slate-900"
          @click="handleItemClick(item.type)"
        >
          <span class="flex w-full items-start justify-between gap-2">
            <span class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ item.label }}</span>
            <span
              v-if="item.configured"
              class="shrink-0 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            >
              ready
            </span>
          </span>
          <span class="text-[11px] text-slate-500 group-hover:text-emerald-700 dark:text-slate-400 dark:group-hover:text-emerald-300">
            {{ item.type }}
          </span>
        </button>

        <div
          v-if="visiblePaletteItems.length === 0"
          class="border border-dashed border-slate-300 bg-slate-50 px-3 py-7 text-center text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
        >
          No components match that search.
        </div>
      </VueDraggable>

      <button
        v-if="!hasSearchQuery"
        class="mt-3 flex w-full items-center justify-center gap-1.5 border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
        type="button"
        @click="showAllComponents = !showAllComponents"
      >
        {{ showAllComponents ? 'Show starter blocks' : `Browse all ${componentCount} components` }}
        <NIcon aria-hidden="true" size="14" :class="showAllComponents ? 'rotate-180' : ''" class="transition-transform">
          <ChevronForwardOutline />
        </NIcon>
      </button>
    </div>
  </aside>
</template>
