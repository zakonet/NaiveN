<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { useColorMode, useMediaQuery } from '@vueuse/core'
import { NButton } from 'naive-ui/es/button'
import { NConfigProvider } from 'naive-ui/es/config-provider'
import { NIcon } from 'naive-ui/es/icon'
import type { GlobalTheme } from 'naive-ui/es/config-provider'
import {
  ArrowRedo,
  ArrowUndo,
  CodeSlashOutline,
  LayersOutline,
  MoonOutline,
  OptionsOutline,
  SunnyOutline,
  TrashOutline,
} from '@vicons/ionicons5'

import ComponentPanel from './ComponentPanel.vue'
import Canvas from './Canvas.vue'
import PropertyPanel from '../property/PropertyPanel.vue'
import { useBuilderStore } from '../stores/builder'

const CodePreview = defineAsyncComponent(() => import('../generator/CodePreview.vue'))

const store = useBuilderStore()
const showCodePreview = ref(false)
const isDesktopLayout = useMediaQuery('(min-width: 1024px)')
const isLibraryOpen = ref(true)
const isInspectorOpen = ref(isDesktopLayout.value)
const colorMode = useColorMode({
  selector: 'html',
  attribute: 'class',
  storageKey: 'naiven-color-mode',
  initialValue: 'auto',
  modes: {
    light: 'light',
    dark: 'dark',
  },
})
const isDark = computed(() => colorMode.value === 'dark')
const darkTheme = shallowRef<GlobalTheme | null>(null)
let darkThemePromise: Promise<void> | undefined
const naiveTheme = computed(() => (isDark.value ? darkTheme.value : null))
const isPanelOverlayVisible = computed(
  () => !isDesktopLayout.value && (isLibraryOpen.value || isInspectorOpen.value),
)

function ensureDarkTheme(): Promise<void> {
  if (darkTheme.value) {
    return Promise.resolve()
  }

  return (darkThemePromise ??= import('naive-ui/es/themes/dark')
    .then((module) => {
      darkTheme.value = module.darkTheme
    })
    .catch((error: unknown) => {
      darkThemePromise = undefined
      throw error
    }))
}

function selectNode(id: string): void {
  store.selectNode(id)
}

function addComponent(type: string): void {
  store.addComponent(type)

  if (!isDesktopLayout.value) {
    isLibraryOpen.value = false
    isInspectorOpen.value = true
  }
}

function toggleTheme(): void {
  colorMode.value = isDark.value ? 'light' : 'dark'
}

function toggleLibrary(): void {
  isLibraryOpen.value = !isLibraryOpen.value

  if (isLibraryOpen.value && !isDesktopLayout.value) {
    isInspectorOpen.value = false
  }
}

function toggleInspector(): void {
  isInspectorOpen.value = !isInspectorOpen.value

  if (isInspectorOpen.value && !isDesktopLayout.value) {
    isLibraryOpen.value = false
  }
}

function closeLibrary(): void {
  isLibraryOpen.value = false
}

function closeInspector(): void {
  isInspectorOpen.value = false
}

function closePanelOverlay(): void {
  if (!isDesktopLayout.value) {
    isLibraryOpen.value = false
    isInspectorOpen.value = false
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closePanelOverlay()
  }
}

onMounted(() => {
  if (!isDesktopLayout.value) {
    isInspectorOpen.value = false
  }

  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(isDesktopLayout, (isDesktop) => {
  if (!isDesktop) {
    isInspectorOpen.value = false
  }
})

watch(
  isDark,
  (dark) => {
    if (dark) {
      void ensureDarkTheme().catch(() => undefined)
    }
  },
  { immediate: true },
)
</script>

<template>
  <NConfigProvider :theme="naiveTheme">
    <main class="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header class="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:px-5 dark:border-slate-800 dark:bg-slate-900">
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-emerald-600 text-sm font-bold text-white shadow-[0_6px_16px_rgb(5_150_105_/_0.28)]">
            N
          </div>
          <div class="min-w-0">
            <h1 class="text-sm font-semibold tracking-tight text-slate-950 dark:text-slate-50">NaiveN</h1>
            <p class="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">Visual page builder</p>
          </div>
          <div class="hidden min-w-0 border-l border-slate-200 pl-3 lg:block dark:border-slate-700">
            <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Workspace</p>
            <p class="max-w-52 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
              {{ store.page.value.name }}
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-1 sm:gap-2">
          <NButton
            quaternary
            size="small"
            :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
            :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
            @click="toggleTheme"
          >
            <template #icon>
              <NIcon aria-hidden="true">
                <SunnyOutline v-if="isDark" />
                <MoonOutline v-else />
              </NIcon>
            </template>
          </NButton>
          <div class="hidden h-5 w-px bg-slate-200 sm:mx-1 sm:block dark:bg-slate-700" />
          <NButton
            quaternary
            size="small"
            :aria-label="isLibraryOpen ? 'Hide component library' : 'Show component library'"
            :title="isLibraryOpen ? 'Hide component library' : 'Show component library'"
            @click="toggleLibrary"
          >
            <template #icon>
              <NIcon aria-hidden="true"><LayersOutline /></NIcon>
            </template>
          </NButton>
          <NButton
            quaternary
            size="small"
            :aria-label="isInspectorOpen ? 'Hide inspector' : 'Show inspector'"
            :title="isInspectorOpen ? 'Hide inspector' : 'Show inspector'"
            @click="toggleInspector"
          >
            <template #icon>
              <NIcon aria-hidden="true"><OptionsOutline /></NIcon>
            </template>
          </NButton>
          <div class="hidden h-5 w-px bg-slate-200 sm:mx-1 sm:block dark:bg-slate-700" />
          <NButton
            quaternary
            size="small"
            v-if="isDesktopLayout"
            :disabled="!store.canUndo.value"
            aria-label="Undo"
            title="Undo"
            @click="store.undo"
          >
            <template #icon>
              <NIcon aria-hidden="true"><ArrowUndo /></NIcon>
            </template>
          </NButton>
          <NButton
            quaternary
            size="small"
            v-if="isDesktopLayout"
            :disabled="!store.canRedo.value"
            aria-label="Redo"
            title="Redo"
            @click="store.redo"
          >
            <template #icon>
              <NIcon aria-hidden="true"><ArrowRedo /></NIcon>
            </template>
          </NButton>
          <NButton
            secondary
            type="primary"
            size="small"
            aria-label="Preview Vue SFC"
            title="Preview Vue SFC"
            @click="showCodePreview = true"
          >
            <template #icon>
              <NIcon aria-hidden="true"><CodeSlashOutline /></NIcon>
            </template>
            <span class="hidden sm:inline">Code</span>
          </NButton>
          <div class="hidden h-5 w-px bg-slate-200 sm:mx-1 sm:block dark:bg-slate-700" />
          <NButton
            quaternary
            size="small"
            :disabled="!store.selectedNode.value"
            aria-label="Delete selected component"
            title="Delete selected component"
            @click="store.removeSelectedNode"
          >
            <template #icon>
              <NIcon aria-hidden="true"><TrashOutline /></NIcon>
            </template>
          </NButton>
        </div>
      </header>

      <div class="relative flex min-h-0 flex-1 overflow-hidden">
        <ComponentPanel
          v-if="isLibraryOpen"
          class="absolute inset-y-0 left-0 z-30 w-[min(21rem,calc(100vw-1rem))] shrink-0 shadow-2xl lg:relative lg:inset-auto lg:w-72 lg:shadow-none"
          @add="addComponent"
          @close="closeLibrary"
        />

        <button
          v-if="isPanelOverlayVisible"
          class="absolute inset-0 z-20 bg-slate-950/20 backdrop-blur-[1px] lg:hidden"
          type="button"
          aria-label="Close side panel"
          @click="closePanelOverlay"
        />

        <Canvas
          class="min-w-0 flex-1"
          @select="selectNode"
          @toggle-library="toggleLibrary"
          @toggle-inspector="toggleInspector"
        />

        <PropertyPanel
          v-if="isInspectorOpen"
          class="absolute inset-y-0 right-0 z-30 w-[min(21rem,calc(100vw-1rem))] shrink-0 shadow-2xl lg:relative lg:inset-auto lg:w-80 lg:shadow-none"
          @close="closeInspector"
        />
      </div>

      <CodePreview
        v-if="showCodePreview"
        v-model:show="showCodePreview"
        :page="store.page.value"
      />
    </main>
  </NConfigProvider>
</template>
