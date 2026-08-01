import type { Component } from 'vue'

export type SchemaPrimitive = string | number | boolean | null

export type SchemaValue =
  | SchemaPrimitive
  | SchemaValue[]
  | {
      [key: string]: SchemaValue
    }

export type SchemaProps = Record<string, SchemaValue | undefined>

export interface SchemaStyle {
  class?: string
  [property: string]: string | number | undefined
}

export type SchemaEvents = Record<string, string>

export interface TextSchemaNode {
  id: string
  type: 'text'
  value: string
  style?: SchemaStyle
}

export interface ComponentSchemaNode {
  id: string
  type: string
  props: SchemaProps
  children: SchemaNode[]
  style?: SchemaStyle
  events?: SchemaEvents
}

export type SchemaNode = TextSchemaNode | ComponentSchemaNode

export function isTextSchemaNode(node: SchemaNode): node is TextSchemaNode {
  return node.type === 'text' && 'value' in node
}

export function isComponentSchemaNode(node: SchemaNode): node is ComponentSchemaNode {
  return !isTextSchemaNode(node)
}

export interface PageSchema {
  version: 1
  id: string
  name: string
  children: SchemaNode[]
}

export type PropertyEditorType = 'text' | 'number' | 'boolean' | 'select' | 'json'

export interface PropertySchema {
  name: string
  label: string
  type: PropertyEditorType
  options?: readonly string[]
  defaultValue?: unknown
}

export interface ComponentMetadata {
  name: string
  label: string
  description: string
  component: Component
  propsSchema: readonly PropertySchema[]
  loadPropsSchema?: () => Promise<readonly PropertySchema[]>
  defaultProps: SchemaProps
  createChildren?: () => SchemaNode[]
  configured: boolean
  source: 'naive-ui' | 'custom'
}

export interface ComponentPaletteItem {
  type: string
  label: string
  description: string
  configured: boolean
}

export type ComponentMetadataOverride = Partial<
  Omit<ComponentMetadata, 'name' | 'component' | 'configured' | 'source'>
> & {
  label?: string
  description?: string
}
