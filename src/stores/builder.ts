import { useRefHistory } from '@vueuse/core'
import { computed, ref } from 'vue'

import { componentRegistry } from '../core/registry'
import {
  cloneSchemaValue,
  createPageSchema,
  findSchemaNode,
  removeSchemaNode,
  updateSchemaNode,
} from '../core/schema'
import {
  isComponentSchemaNode,
  isTextSchemaNode,
  type PageSchema,
  type SchemaNode,
  type SchemaProps,
  type SchemaStyle,
} from '../core/types'

const page = ref<PageSchema>(createPageSchema('Untitled page'))
const selectedNodeId = ref<string | null>(null)
const { undo, redo, canUndo, canRedo, clear } = useRefHistory(page, {
  deep: true,
  clone: true,
  capacity: 50,
})

const selectedNode = computed(() =>
  selectedNodeId.value
    ? findSchemaNode(page.value.children, selectedNodeId.value)
    : undefined,
)

const rootNodes = computed<SchemaNode[]>({
  get: () => page.value.children,
  set: (nodes) => {
    page.value.children = nodes
  },
})

function selectNode(id: string | null): void {
  selectedNodeId.value = id
}

function addComponent(type: string): SchemaNode {
  const node = componentRegistry.createNode(type)
  page.value.children.push(node)
  selectedNodeId.value = node.id
  return node
}

function removeSelectedNode(): void {
  if (!selectedNodeId.value) {
    return
  }

  const removed = removeSchemaNode(page.value.children, selectedNodeId.value)
  if (removed) {
    selectedNodeId.value = null
  }
}

function updateNodeProps(id: string, props: SchemaProps): void {
  updateSchemaNode(page.value.children, id, (node) => {
    if (isComponentSchemaNode(node)) {
      node.props = {
        ...node.props,
        ...cloneSchemaValue(props),
      }
    }
  })
}

function updateTextNode(id: string, value: string): void {
  updateSchemaNode(page.value.children, id, (node) => {
    if (isTextSchemaNode(node)) {
      node.value = value
    }
  })
}

function updateNodeStyle(id: string, style: SchemaStyle): void {
  updateSchemaNode(page.value.children, id, (node) => {
    node.style = {
      ...node.style,
      ...cloneSchemaValue(style),
    }
  })
}

function replaceRootNodes(nodes: SchemaNode[]): void {
  page.value.children = nodes
}

function reset(): void {
  page.value = createPageSchema('Untitled page')
  selectedNodeId.value = null
  clear()
}

export function useBuilderStore() {
  return {
    page,
    rootNodes,
    selectedNodeId,
    selectedNode,
    canUndo,
    canRedo,
    selectNode,
    addComponent,
    removeSelectedNode,
    updateNodeProps,
    updateTextNode,
    updateNodeStyle,
    replaceRootNodes,
    undo,
    redo,
    reset,
  }
}
