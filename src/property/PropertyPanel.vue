<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CloseOutline, OptionsOutline } from '@vicons/ionicons5'
import { NIcon } from 'naive-ui/es/icon'

import { componentRegistry } from '../core/registry'
import {
  isComponentSchemaNode,
  isTextSchemaNode,
  type ComponentSchemaNode,
  type PropertySchema,
  type SchemaValue,
} from '../core/types'
import { useBuilderStore } from '../stores/builder'

const emit = defineEmits<{
  close: []
}>()

const store = useBuilderStore()
const inferredPropsSchema = ref<readonly PropertySchema[]>([])
const jsonDrafts = ref<Record<string, string>>({})
const jsonErrors = ref<Record<string, string | undefined>>({})
const isLoadingProps = ref(false)
const loadError = ref<string | null>(null)
let loadToken = 0

const textNode = computed(() => {
  const node = store.selectedNode.value

  return node && isTextSchemaNode(node) ? node : undefined
})
const componentNode = computed(() => {
  const node = store.selectedNode.value

  return node && isComponentSchemaNode(node) ? node : undefined
})
const metadata = computed(() =>
  componentNode.value ? componentRegistry.getComponent(componentNode.value.type) : undefined,
)
const selectedNode = computed(() => store.selectedNode.value)
const selectedLabel = computed(() => {
  if (textNode.value) {
    return 'Text'
  }

  return metadata.value?.label ?? componentNode.value?.type ?? 'Nothing selected'
})
const activePropsSchema = computed<readonly PropertySchema[]>(() => {
  if (metadata.value?.propsSchema.length) {
    return metadata.value.propsSchema
  }

  return inferredPropsSchema.value
})
const propsSourceLabel = computed(() =>
  metadata.value?.propsSchema.length ? 'metadata' : 'runtime props',
)
const selectedScale = computed(() => {
  const transform = selectedNode.value?.style?.transform

  if (typeof transform !== 'string') {
    return 1
  }

  const match = transform.match(/scale\(([\d.]+)\)/)
  const scale = match ? Number(match[1]) : 1

  return Number.isFinite(scale) ? scale : 1
})

watch(
  () => componentNode.value?.type,
  async () => {
    const token = ++loadToken
    inferredPropsSchema.value = []
    loadError.value = null

    if (!metadata.value || metadata.value.propsSchema.length || !metadata.value.loadPropsSchema) {
      return
    }

    isLoadingProps.value = true

    try {
      const schema = await metadata.value.loadPropsSchema()

      if (token === loadToken) {
        inferredPropsSchema.value = schema
      }
    } catch (error) {
      if (token === loadToken) {
        loadError.value = error instanceof Error ? error.message : 'Failed to load props.'
      }
    } finally {
      if (token === loadToken) {
        isLoadingProps.value = false
      }
    }
  },
  { immediate: true },
)

watch(
  () => componentNode.value?.id,
  () => {
    jsonDrafts.value = {}
    jsonErrors.value = {}
  },
)

function fallbackValue(type: PropertySchema['type']): SchemaValue {
  if (type === 'boolean') {
    return false
  }

  if (type === 'number') {
    return 0
  }

  if (type === 'json') {
    return null
  }

  return ''
}

function toSchemaValue(value: unknown, fallback: SchemaValue): SchemaValue {
  if (value === undefined) {
    return fallback
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (Array.isArray(value) || typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value)) as SchemaValue
    } catch {
      return fallback
    }
  }

  return fallback
}

function getPropValue(field: PropertySchema): SchemaValue {
  const node = componentNode.value
  const value = node?.props[field.name] ?? field.defaultValue

  return toSchemaValue(value, fallbackValue(field.type))
}

function updateProp(node: ComponentSchemaNode, field: PropertySchema, value: SchemaValue): void {
  store.updateNodeProps(node.id, {
    [field.name]: value,
  })
}

function clampScale(value: number): number {
  return Math.min(Math.max(value, 0.25), 3)
}

function handleScaleInput(event: Event): void {
  if (!selectedNode.value) {
    return
  }

  const scale = clampScale(Number((event.target as HTMLInputElement).value))

  store.updateNodeStyle(selectedNode.value.id, {
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  })
}

function handleTextInput(event: Event): void {
  if (!textNode.value) {
    return
  }

  store.updateTextNode(textNode.value.id, (event.target as HTMLTextAreaElement).value)
}

function handleStringInput(field: PropertySchema, event: Event): void {
  if (!componentNode.value) {
    return
  }

  updateProp(componentNode.value, field, (event.target as HTMLInputElement).value)
}

function handleNumberInput(field: PropertySchema, event: Event): void {
  if (!componentNode.value) {
    return
  }

  const value = Number((event.target as HTMLInputElement).value)

  if (!Number.isNaN(value)) {
    updateProp(componentNode.value, field, value)
  }
}

function handleBooleanInput(field: PropertySchema, event: Event): void {
  if (!componentNode.value) {
    return
  }

  updateProp(componentNode.value, field, (event.target as HTMLInputElement).checked)
}

function formatJsonValue(field: PropertySchema): string {
  if (jsonDrafts.value[field.name] !== undefined) {
    return jsonDrafts.value[field.name]
  }

  return JSON.stringify(getPropValue(field), null, 2)
}

function handleJsonInput(field: PropertySchema, event: Event): void {
  jsonDrafts.value = {
    ...jsonDrafts.value,
    [field.name]: (event.target as HTMLTextAreaElement).value,
  }
}

function commitJsonInput(field: PropertySchema): void {
  if (!componentNode.value) {
    return
  }

  const raw = jsonDrafts.value[field.name] ?? formatJsonValue(field)

  try {
    const parsed = raw.trim() ? (JSON.parse(raw) as SchemaValue) : null
    updateProp(componentNode.value, field, parsed)
    jsonErrors.value = {
      ...jsonErrors.value,
      [field.name]: undefined,
    }
  } catch {
    jsonErrors.value = {
      ...jsonErrors.value,
      [field.name]: 'Invalid JSON',
    }
  }
}
</script>

<template>
  <aside class="flex min-h-0 flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <header class="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2.5">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <NIcon aria-hidden="true" size="17"><OptionsOutline /></NIcon>
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">Inspector</p>
            <h2 class="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
              {{ selectedLabel }}
            </h2>
          </div>
        </div>
        <button
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          type="button"
          aria-label="Hide inspector"
          title="Hide inspector"
          @click="emit('close')"
        >
          <NIcon aria-hidden="true" size="16"><CloseOutline /></NIcon>
        </button>
      </div>
      <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {{ selectedNode ? 'Adjust the selected node without leaving the canvas.' : 'Select a node on the canvas to edit it.' }}
      </p>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-4">
      <div v-if="selectedNode" class="mb-4 border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
        <div class="flex items-center justify-between gap-3">
          <div>
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-200" for="node-scale">Scale</label>
            <p class="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Visual size on the canvas</p>
          </div>
          <input
            class="h-8 w-16 border border-slate-200 bg-white px-2 text-right text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            type="number"
            min="0.25"
            max="3"
            step="0.05"
            :value="selectedScale"
            @change="handleScaleInput"
          />
        </div>
        <input
          id="node-scale"
          class="mt-3 w-full accent-emerald-600"
          type="range"
          min="0.25"
          max="3"
          step="0.05"
          :value="selectedScale"
          @input="handleScaleInput"
        />
      </div>

      <div v-if="textNode" class="grid gap-3">
        <label class="grid gap-1.5">
          <span class="text-xs font-medium text-slate-600 dark:text-slate-300">Content</span>
          <textarea
            class="min-h-24 resize-y border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            :value="textNode.value"
            @input="handleTextInput"
          />
        </label>
      </div>

      <div v-else-if="componentNode" class="grid gap-4">
        <div class="border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Schema node
          </p>
          <p class="mt-2 break-all font-mono text-xs text-slate-700 dark:text-slate-200">
            {{ componentNode.id }}
          </p>
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Props source: {{ propsSourceLabel }}
          </p>
        </div>

        <div v-if="isLoadingProps" class="text-xs text-slate-500 dark:text-slate-400">
          Loading props...
        </div>

        <div v-else-if="loadError" class="border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {{ loadError }}
        </div>

        <div v-else-if="activePropsSchema.length" class="grid gap-3">
          <label
            v-for="field in activePropsSchema"
            :key="field.name"
            class="grid gap-1.5"
          >
            <span class="flex items-center justify-between gap-2">
              <span class="text-xs font-medium text-slate-600 dark:text-slate-300">
                {{ field.label }}
              </span>
              <span class="font-mono text-[10px] text-slate-400">{{ field.name }}</span>
            </span>

            <input
              v-if="field.type === 'text'"
              class="h-9 border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="text"
              :value="String(getPropValue(field))"
              @input="handleStringInput(field, $event)"
            />

            <input
              v-else-if="field.type === 'number'"
              class="h-9 border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="number"
              :value="Number(getPropValue(field))"
              @input="handleNumberInput(field, $event)"
            />

            <select
              v-else-if="field.type === 'select'"
              class="h-9 border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              :value="String(getPropValue(field))"
              @change="handleStringInput(field, $event)"
            >
              <option
                v-for="option in field.options"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>

            <label
              v-else-if="field.type === 'boolean'"
              class="flex h-9 items-center gap-2 border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <input
                type="checkbox"
                :checked="Boolean(getPropValue(field))"
                @change="handleBooleanInput(field, $event)"
              />
              <span>{{ Boolean(getPropValue(field)) ? 'true' : 'false' }}</span>
            </label>

            <div v-else class="grid gap-1">
              <textarea
                class="min-h-24 resize-y border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                :value="formatJsonValue(field)"
                @input="handleJsonInput(field, $event)"
                @blur="commitJsonInput(field)"
              />
              <span
                v-if="jsonErrors[field.name]"
                class="text-xs text-rose-600 dark:text-rose-300"
              >
                {{ jsonErrors[field.name] }}
              </span>
            </div>
          </label>
        </div>

        <div v-else class="border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          No editable props discovered.
        </div>
      </div>

      <div v-else class="flex min-h-56 items-center justify-center border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950">
        <div class="max-w-44">
          <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
            <NIcon aria-hidden="true" size="18"><OptionsOutline /></NIcon>
          </div>
          <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Select a component on the canvas to inspect its properties.
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>
