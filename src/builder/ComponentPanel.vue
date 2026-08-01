<script setup lang="ts">
import { computed, ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'

import { componentRegistry } from '../core/registry'
import type { ComponentPaletteItem, SchemaNode } from '../core/types'

const searchQuery = ref('')
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

function clonePaletteItem(item: ComponentPaletteItem): SchemaNode {
  return componentRegistry.createNode(item.type)
}
</script>

<template>
  <aside class="flex min-h-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <div class="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
      <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">
        Component library
      </p>
      <h2 class="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">Naive UI</h2>
      <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {{ componentCount }} components registered.
      </p>
      <input
        v-model="searchQuery"
        type="search"
        class="mt-3 h-9 w-full border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
        placeholder="Search components"
      />
    </div>

    <VueDraggable
      v-model="paletteItems"
      class="grid content-start gap-2 overflow-y-auto p-3"
      :group="{ name: 'naiven-components', pull: 'clone', put: false }"
      :sort="false"
      :clone="clonePaletteItem"
      item-key="type"
      ghost-class="sortable-ghost"
    >
      <button
        v-for="item in paletteItems"
        :key="item.type"
        type="button"
        class="group flex min-h-16 flex-col items-start justify-between border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-500 dark:hover:bg-slate-900"
      >
        <span class="flex w-full items-start justify-between gap-2">
          <span class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ item.label }}</span>
          <span
            v-if="item.configured"
            class="shrink-0 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          >
            meta
          </span>
        </span>
        <span class="text-xs text-slate-500 group-hover:text-emerald-700 dark:text-slate-400 dark:group-hover:text-emerald-300">
          {{ item.type }}
        </span>
      </button>

      <div
        v-if="paletteItems.length === 0"
        class="border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
      >
        No components found.
      </div>
    </VueDraggable>
  </aside>
</template>
