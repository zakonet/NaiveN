<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'

import { componentRegistry } from '../core/registry'
import {
  isComponentSchemaNode,
  isTextSchemaNode,
  type ComponentSchemaNode,
  type SchemaNode,
  type SchemaStyle,
} from '../core/types'

defineOptions({
  name: 'ComponentRenderer',
})

const props = defineProps<{
  node: SchemaNode
  selected?: boolean
  selectedId?: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  resize: [id: string, style: SchemaStyle]
}>()

const metadata = computed(() =>
  isComponentSchemaNode(props.node)
    ? componentRegistry.getComponent(props.node.type)
    : undefined,
)
const textNode = computed(() =>
  isTextSchemaNode(props.node) ? props.node : undefined,
)
const componentNode = computed(() =>
  isComponentSchemaNode(props.node) ? props.node : undefined,
)
const isSelected = computed(() => props.selected || props.selectedId === props.node.id)
const resizeHandles = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
] as const
type ResizeHandle = (typeof resizeHandles)[number]
let stopResize: (() => void) | undefined

function inlineStyle(style?: SchemaStyle): Record<string, string | number> {
  if (!style) {
    return {}
  }

  return Object.entries(style).reduce<Record<string, string | number>>(
    (result, [property, value]) => {
      if (property !== 'class' && value !== undefined) {
        result[property] = value
      }

      return result
    },
    {},
  )
}

function componentFillStyle(style?: SchemaStyle): Record<string, string> | undefined {
  const fillStyle: Record<string, string> = {}

  if (style?.width || style?.['--naiven-base-width']) {
    fillStyle.width = '100%'
  }

  if (style?.height || style?.['--naiven-base-height']) {
    fillStyle.height = '100%'
  }

  return Object.keys(fillStyle).length ? fillStyle : undefined
}

function componentContentStyle(style?: SchemaStyle): Record<string, string> | undefined {
  const baseWidth = style?.['--naiven-base-width']
  const baseHeight = style?.['--naiven-base-height']
  const scaleX = style?.['--naiven-scale-x']
  const scaleY = style?.['--naiven-scale-y']

  if (
    typeof baseWidth !== 'string' ||
    typeof baseHeight !== 'string' ||
    typeof scaleX !== 'string' ||
    typeof scaleY !== 'string'
  ) {
    return undefined
  }

  return {
    width: baseWidth,
    height: baseHeight,
    transform: `scale(${scaleX}, ${scaleY})`,
    transformOrigin: 'top left',
  }
}

function handleSelect(): void {
  emit('select', props.node.id)
}

function handleChildSelect(id: string): void {
  emit('select', id)
}

function handleChildResize(id: string, style: SchemaStyle): void {
  emit('resize', id, style)
}

function parseScale(style?: SchemaStyle): number {
  const transform = style?.transform

  if (typeof transform !== 'string') {
    return 1
  }

  const match = transform.match(/scale\(([\d.]+)\)/)
  const scale = match ? Number(match[1]) : 1

  return Number.isFinite(scale) ? scale : 1
}

function handleClass(handle: ResizeHandle): string {
  const base =
    'pointer-events-auto absolute z-20 h-3 w-3 border border-emerald-600 bg-white shadow-sm dark:bg-slate-950'
  const positions: Record<ResizeHandle, string> = {
    nw: '-left-1.5 -top-1.5 cursor-nwse-resize',
    n: 'left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize',
    ne: '-right-1.5 -top-1.5 cursor-nesw-resize',
    e: '-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize',
    se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
    s: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize',
    sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
    w: '-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize',
  }

  return `${base} ${positions[handle]}`
}

function cursorForHandle(handle: ResizeHandle): string {
  if (handle === 'n' || handle === 's') {
    return 'ns-resize'
  }

  if (handle === 'e' || handle === 'w') {
    return 'ew-resize'
  }

  return handle === 'ne' || handle === 'sw' ? 'nesw-resize' : 'nwse-resize'
}

function startResize(event: PointerEvent, handle: ResizeHandle): void {
  if (!componentNode.value) {
    return
  }

  const frame = (event.currentTarget as HTMLElement).closest<HTMLElement>('[data-schema-id]')

  if (!frame) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  stopResize?.()

  const node = componentNode.value
  const rect = frame.getBoundingClientRect()
  const scale = parseScale(node.style)
  const startX = event.clientX
  const startY = event.clientY
  const startWidth = rect.width / scale
  const startHeight = rect.height / scale
  const baseWidthValue = Number.parseFloat(String(node.style?.['--naiven-base-width'] ?? ''))
  const baseHeightValue = Number.parseFloat(String(node.style?.['--naiven-base-height'] ?? ''))
  const baseWidth = Number.isFinite(baseWidthValue) && baseWidthValue > 0 ? baseWidthValue : startWidth
  const baseHeight =
    Number.isFinite(baseHeightValue) && baseHeightValue > 0 ? baseHeightValue : startHeight
  const previousCursor = document.body.style.cursor
  const previousUserSelect = document.body.style.userSelect

  document.body.style.cursor = cursorForHandle(handle)
  document.body.style.userSelect = 'none'

  const handleMove = (moveEvent: PointerEvent): void => {
    const deltaX = (moveEvent.clientX - startX) / scale
    const deltaY = (moveEvent.clientY - startY) / scale
    let nextWidth = startWidth
    let nextHeight = startHeight

    if (handle.includes('e')) {
      nextWidth = startWidth + deltaX
    }

    if (handle.includes('w')) {
      nextWidth = startWidth - deltaX
    }

    if (handle.includes('s')) {
      nextHeight = startHeight + deltaY
    }

    if (handle.includes('n')) {
      nextHeight = startHeight - deltaY
    }

    nextWidth = Math.max(32, Math.round(nextWidth))
    nextHeight = Math.max(32, Math.round(nextHeight))

    emit('resize', node.id, {
      width: `${nextWidth}px`,
      height: `${nextHeight}px`,
      '--naiven-base-width': `${baseWidth}px`,
      '--naiven-base-height': `${baseHeight}px`,
      '--naiven-scale-x': String(nextWidth / baseWidth),
      '--naiven-scale-y': String(nextHeight / baseHeight),
    })
  }

  const handleUp = (): void => {
    window.removeEventListener('pointermove', handleMove)
    window.removeEventListener('pointerup', handleUp)
    document.body.style.cursor = previousCursor
    document.body.style.userSelect = previousUserSelect
    stopResize = undefined
  }

  window.addEventListener('pointermove', handleMove)
  window.addEventListener('pointerup', handleUp)
  stopResize = handleUp
}

onBeforeUnmount(() => {
  stopResize?.()
})
</script>

<template>
  <span
    v-if="textNode"
    class="block min-h-6 whitespace-pre-wrap text-left text-sm text-slate-700 dark:text-slate-200"
    :class="textNode.style?.class"
    :style="inlineStyle(textNode.style)"
    :data-schema-id="textNode.id"
    @click.stop="handleSelect"
  >
    {{ textNode.value }}
  </span>

  <div
    v-else-if="componentNode && metadata"
    class="relative min-w-0"
    :class="[
      componentNode.style?.class,
      isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900' : 'ring-1 ring-transparent hover:ring-slate-300 dark:hover:ring-slate-600',
    ]"
    :style="inlineStyle(componentNode.style)"
    :data-schema-id="componentNode.id"
    @click.stop="handleSelect"
  >
    <div :style="componentContentStyle(componentNode.style)">
      <component
        :is="metadata.component"
        v-bind="componentNode.props as ComponentSchemaNode['props']"
        :style="componentFillStyle(componentNode.style)"
      >
        <ComponentRenderer
          v-for="child in componentNode.children"
          :key="child.id"
          :node="child"
          :selected-id="selectedId"
          @select="handleChildSelect"
          @resize="handleChildResize"
        />
      </component>
    </div>

    <div
      v-if="isSelected"
      class="pointer-events-none absolute inset-0 z-10"
      aria-hidden="true"
    >
      <button
        v-for="handle in resizeHandles"
        :key="handle"
        type="button"
        :class="handleClass(handle)"
        :aria-label="`Resize ${handle}`"
        @pointerdown="startResize($event, handle)"
      />
    </div>
  </div>

  <div
    v-else
    class="border border-dashed border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
  >
    Unknown component: {{ node.type }}
  </div>
</template>
