import { isComponentSchemaNode } from './types'
import type {
  ComponentSchemaNode,
  PageSchema,
  SchemaNode,
  SchemaProps,
  SchemaStyle,
  TextSchemaNode,
} from './types'

let idSequence = 0

export function createSchemaId(prefix = 'node'): string {
  idSequence += 1

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now().toString(36)}-${idSequence.toString(36)}`
}

export function createTextNode(value = 'Text', style?: SchemaStyle): TextSchemaNode {
  return {
    id: createSchemaId('text'),
    type: 'text',
    value,
    ...(style ? { style } : {}),
  }
}

export function createComponentNode(
  type: string,
  props: SchemaProps = {},
  children: SchemaNode[] = [],
): ComponentSchemaNode {
  return {
    id: createSchemaId(type.toLowerCase()),
    type,
    props: cloneSchemaValue(props),
    children: cloneSchemaValue(children),
  }
}

export function createPageSchema(
  name = 'Untitled page',
  children: SchemaNode[] = [],
): PageSchema {
  return {
    version: 1,
    id: createSchemaId('page'),
    name,
    children: cloneSchemaValue(children),
  }
}

export function cloneSchemaValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function findSchemaNode(
  nodes: readonly SchemaNode[],
  id: string,
): SchemaNode | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }

    if (isComponentSchemaNode(node)) {
      const child = findSchemaNode(node.children, id)
      if (child) {
        return child
      }
    }
  }

  return undefined
}

export function removeSchemaNode(nodes: SchemaNode[], id: string): boolean {
  const index = nodes.findIndex((node) => node.id === id)

  if (index >= 0) {
    nodes.splice(index, 1)
    return true
  }

  for (const node of nodes) {
    if (isComponentSchemaNode(node) && removeSchemaNode(node.children, id)) {
      return true
    }
  }

  return false
}

export function updateSchemaNode(
  nodes: readonly SchemaNode[],
  id: string,
  update: (node: SchemaNode) => void,
): boolean {
  const node = findSchemaNode(nodes, id)

  if (!node) {
    return false
  }

  update(node)
  return true
}
