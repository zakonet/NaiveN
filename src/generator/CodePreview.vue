<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { NAlert } from 'naive-ui/es/alert'
import { NButton } from 'naive-ui/es/button'
import { NDrawer, NDrawerContent } from 'naive-ui/es/drawer'
import { NIcon } from 'naive-ui/es/icon'
import {
  CheckmarkOutline,
  CloseOutline,
  CodeSlashOutline,
  CopyOutline,
  DownloadOutline,
} from '@vicons/ionicons5'

import { generateVueSfc } from './vue'
import type { PageSchema } from '../core/types'

const props = defineProps<{
  page: PageSchema
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const code = ref('')
const errorMessage = ref<string | null>(null)
const isGenerating = ref(false)
const copyState = ref<'idle' | 'copied' | 'error'>('idle')
let generationRequestId = 0
let copyResetTimer: ReturnType<typeof setTimeout> | undefined

const copyTitle = computed(() => {
  if (copyState.value === 'copied') {
    return 'Code copied'
  }

  if (copyState.value === 'error') {
    return 'Copy failed'
  }

  return 'Copy Vue SFC'
})

async function refreshCode(): Promise<void> {
  const requestId = ++generationRequestId
  isGenerating.value = true
  errorMessage.value = null

  try {
    const generatedCode = await generateVueSfc(props.page)

    if (requestId === generationRequestId) {
      code.value = generatedCode
    }
  } catch (error) {
    if (requestId === generationRequestId) {
      errorMessage.value =
        error instanceof Error ? error.message : 'Unable to generate Vue SFC code.'
      code.value = ''
    }
  } finally {
    if (requestId === generationRequestId) {
      isGenerating.value = false
    }
  }
}

function close(): void {
  emit('update:show', false)
}

function resetCopyState(): void {
  copyState.value = 'idle'
  copyResetTimer = undefined
}

function scheduleCopyStateReset(): void {
  if (copyResetTimer) {
    clearTimeout(copyResetTimer)
  }

  copyResetTimer = setTimeout(resetCopyState, 1800)
}

async function copyCode(): Promise<void> {
  if (!code.value || !navigator.clipboard) {
    copyState.value = 'error'
    scheduleCopyStateReset()
    return
  }

  try {
    await navigator.clipboard.writeText(code.value)
    copyState.value = 'copied'
  } catch {
    copyState.value = 'error'
  }

  scheduleCopyStateReset()
}

function downloadCode(): void {
  if (!code.value) {
    return
  }

  const fileName =
    props.page.name
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'naiven-page'
  const blob = new Blob([code.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${fileName}.vue`
  link.click()
  URL.revokeObjectURL(url)
}

watch(
  () => props.page,
  () => {
    if (props.show) {
      void refreshCode()
    }
  },
  { deep: true },
)

watch(
  () => props.show,
  (show) => {
    if (show) {
      void refreshCode()
    }
  },
)

onBeforeUnmount(() => {
  if (copyResetTimer) {
    clearTimeout(copyResetTimer)
  }
})
</script>

<template>
  <NDrawer
    :show="show"
    placement="right"
    width="min(760px, 92vw)"
    resizable
    :auto-focus="false"
    @update:show="emit('update:show', $event)"
  >
    <NDrawerContent :native-scrollbar="false">
      <template #header>
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center bg-emerald-600 text-white">
            <NIcon aria-hidden="true" size="17">
              <CodeSlashOutline />
            </NIcon>
          </div>
          <div class="min-w-0">
            <h2 class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              Vue SFC
            </h2>
            <p class="truncate text-[11px] text-slate-500 dark:text-slate-400">
              Live output from the current page schema
            </p>
          </div>
        </div>
      </template>

      <div class="flex min-h-full flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-slate-500 dark:text-slate-400">
            {{ isGenerating ? 'Generating...' : 'Generated code' }}
          </span>
          <div class="flex items-center gap-1">
            <NButton
              quaternary
              size="small"
              :disabled="!code || isGenerating"
              :aria-label="copyTitle"
              :title="copyTitle"
              @click="copyCode"
            >
              <template #icon>
                <NIcon aria-hidden="true">
                  <CheckmarkOutline v-if="copyState === 'copied'" />
                  <CloseOutline v-else-if="copyState === 'error'" />
                  <CopyOutline v-else />
                </NIcon>
              </template>
            </NButton>
            <NButton
              quaternary
              size="small"
              :disabled="!code || isGenerating"
              aria-label="Download Vue SFC"
              title="Download Vue SFC"
              @click="downloadCode"
            >
              <template #icon>
                <NIcon aria-hidden="true"><DownloadOutline /></NIcon>
              </template>
            </NButton>
            <NButton
              quaternary
              size="small"
              aria-label="Close code preview"
              title="Close code preview"
              @click="close"
            >
              <template #icon>
                <NIcon aria-hidden="true"><CloseOutline /></NIcon>
              </template>
            </NButton>
          </div>
        </div>

        <NAlert v-if="errorMessage" type="error" :show-icon="false">
          {{ errorMessage }}
        </NAlert>

        <div
          v-else
          class="min-h-0 flex-1 overflow-auto border border-slate-200 bg-[#1f2023] dark:border-[#3c4043]"
        >
          <pre
            class="m-0 min-h-full whitespace-pre p-4 text-[12px] leading-6 text-[#e8eaed]"
          ><code>{{ code }}</code></pre>
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>
