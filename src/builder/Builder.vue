<script setup lang="ts">
import { computed, ref } from 'vue'
import { useColorMode } from '@vueuse/core'
import { darkTheme, NButton, NConfigProvider, NIcon } from 'naive-ui'
import {
  ArrowRedo,
  ArrowUndo,
  CodeSlashOutline,
  MoonOutline,
  SunnyOutline,
  TrashOutline,
} from '@vicons/ionicons5'

import ComponentPanel from './ComponentPanel.vue'
import Canvas from './Canvas.vue'
import CodePreview from '../generator/CodePreview.vue'
import PropertyPanel from '../property/PropertyPanel.vue'
import { useBuilderStore } from '../stores/builder'

const store = useBuilderStore()
const showCodePreview = ref(false)
const colorMode = useColorMode({
  selector: 'html',
  attribute: 'class',
  storageKey: 'naiven-color-mode',
  initialValue: 'light',
  modes: {
    light: 'light',
    dark: 'dark',
  },
})
const isDark = computed(() => colorMode.value === 'dark')
const naiveTheme = computed(() => (isDark.value ? darkTheme : null))

function selectNode(id: string): void {
  store.selectNode(id)
}

function toggleTheme(): void {
  colorMode.value = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <NConfigProvider :theme="naiveTheme">
    <main class="flex min-h-screen flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header class="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center bg-emerald-600 text-sm font-bold text-white">
            N
          </div>
          <div>
            <h1 class="text-sm font-semibold tracking-tight text-slate-950 dark:text-slate-50">NaiveN</h1>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Visual page builder</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <NButton
            quaternary
            size="small"
            :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
            :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
            @click="toggleTheme"
          >
            <template #icon>
              <NIcon>
                <SunnyOutline v-if="isDark" />
                <MoonOutline v-else />
              </NIcon>
            </template>
          </NButton>
          <div class="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <NButton
            quaternary
            size="small"
            :disabled="!store.canUndo.value"
            aria-label="Undo"
            title="Undo"
            @click="store.undo"
          >
            <template #icon>
              <NIcon><ArrowUndo /></NIcon>
            </template>
          </NButton>
          <NButton
            quaternary
            size="small"
            :disabled="!store.canRedo.value"
            aria-label="Redo"
            title="Redo"
            @click="store.redo"
          >
            <template #icon>
              <NIcon><ArrowRedo /></NIcon>
            </template>
          </NButton>
          <NButton
            quaternary
            size="small"
            aria-label="Preview Vue SFC"
            title="Preview Vue SFC"
            @click="showCodePreview = true"
          >
            <template #icon>
              <NIcon><CodeSlashOutline /></NIcon>
            </template>
          </NButton>
          <div class="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <NButton
            quaternary
            size="small"
            :disabled="!store.selectedNode.value"
            aria-label="Delete selected component"
            title="Delete selected component"
            @click="store.removeSelectedNode"
          >
            <template #icon>
              <NIcon><TrashOutline /></NIcon>
            </template>
          </NButton>
        </div>
      </header>

      <div class="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)_240px]">
        <ComponentPanel />
        <Canvas @select="selectNode" />
        <PropertyPanel />
      </div>

      <CodePreview v-model:show="showCodePreview" :page="store.page.value" />
    </main>
  </NConfigProvider>
</template>
