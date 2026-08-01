import type { Options } from 'prettier'
import { format } from 'prettier/standalone'
import * as babelPlugin from 'prettier/plugins/babel'
import * as estreePlugin from 'prettier/plugins/estree'
import * as htmlPlugin from 'prettier/plugins/html'
import * as typescriptPlugin from 'prettier/plugins/typescript'

import {
  isComponentSchemaNode,
  isTextSchemaNode,
  type ComponentSchemaNode,
  type PageSchema,
  type SchemaNode,
  type SchemaProps,
  type SchemaStyle,
  type SchemaValue,
} from '../core/types'

export type ComponentImportSourceResolver = (componentName: string) => string | undefined
export type ComponentTagNameResolver = (componentName: string) => string
export type VueSfcPrettierOptions = Omit<Options, 'parser' | 'plugins'>

export interface GenerateVueSfcOptions {
  componentImportSource?: ComponentImportSourceResolver
  componentTagName?: ComponentTagNameResolver
  format?: boolean
  prettierOptions?: VueSfcPrettierOptions
}

type ImportGroups = Map<string, Set<string>>

const defaultPrettierOptions: VueSfcPrettierOptions = {
  semi: false,
  singleQuote: true,
}

const validAttributeNamePattern = /^[A-Za-z_:][A-Za-z0-9:._-]*$/
const validHandlerReferencePattern = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/
const validHandlerIdentifierPattern = /^[A-Za-z_$][\w$]*$/

function defaultComponentImportSource(componentName: string): string | undefined {
  return /^N[A-Z0-9]/.test(componentName) ? 'naive-ui' : undefined
}

function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function defaultComponentTagName(componentName: string): string {
  return toKebabCase(componentName)
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeDoubleQuotedAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;')
}

function escapeSingleQuotedAttribute(value: string): string {
  return escapeText(value).replace(/'/g, '&#39;')
}

function assertAttributeName(name: string): void {
  if (!validAttributeNamePattern.test(name)) {
    throw new Error(`Invalid Vue template attribute name: "${name}".`)
  }
}

function assertEventHandler(eventName: string, handler: string): void {
  assertAttributeName(eventName)

  if (!validHandlerReferencePattern.test(handler)) {
    throw new Error(`Invalid event handler reference for "${eventName}": "${handler}".`)
  }
}

function isEmptyStyle(style?: SchemaStyle): boolean {
  if (!style) {
    return true
  }

  return Object.entries(style).every(
    ([name, value]) => name === 'class' || value === undefined,
  )
}

function toCssPropertyName(name: string): string {
  if (name.startsWith('--')) {
    return name
  }

  return name.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
}

function renderClassAttribute(style?: SchemaStyle, props?: SchemaProps): string | undefined {
  const classNames = [
    typeof props?.class === 'string' ? props.class : undefined,
    typeof style?.class === 'string' ? style.class : undefined,
  ].filter((value): value is string => Boolean(value?.trim()))

  if (classNames.length === 0) {
    return undefined
  }

  return `class="${escapeDoubleQuotedAttribute(classNames.join(' '))}"`
}

function renderStyleAttribute(style?: SchemaStyle): string | undefined {
  if (isEmptyStyle(style)) {
    return undefined
  }

  const declarations = Object.entries(style ?? {})
    .filter(([name, value]) => name !== 'class' && value !== undefined)
    .map(([name, value]) => `${toCssPropertyName(name)}: ${String(value)}`)

  if (declarations.length === 0) {
    return undefined
  }

  return `style="${escapeDoubleQuotedAttribute(declarations.join('; '))}"`
}

function renderStaticAttribute(name: string, value: string): string {
  assertAttributeName(name)
  return `${name}="${escapeDoubleQuotedAttribute(value)}"`
}

function renderBoundAttribute(name: string, value: Exclude<SchemaValue, string>): string {
  assertAttributeName(name)

  return `:${name}='${escapeSingleQuotedAttribute(toJavaScriptExpression(value))}'`
}

function renderPropAttribute(name: string, value: SchemaValue | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const attributeName = toKebabCase(name)

  if (typeof value === 'string') {
    return renderStaticAttribute(attributeName, value)
  }

  if (value === true) {
    assertAttributeName(attributeName)
    return attributeName
  }

  return renderBoundAttribute(attributeName, value)
}

function renderEventAttribute(eventName: string, handler: string): string {
  assertEventHandler(eventName, handler)

  return `@${eventName}="${escapeDoubleQuotedAttribute(handler)}"`
}

function toJavaScriptExpression(value: Exclude<SchemaValue, string>): string {
  const expression = JSON.stringify(value)

  if (expression === undefined) {
    throw new Error('Unable to serialize schema value.')
  }

  return expression
}

function renderAttributes(node: ComponentSchemaNode | Extract<SchemaNode, { type: 'text' }>): string {
  const props = isComponentSchemaNode(node) ? node.props : undefined
  const events = isComponentSchemaNode(node) ? node.events : undefined
  const attributes: string[] = []
  const classAttribute = renderClassAttribute(node.style, props)
  const styleAttribute = renderStyleAttribute(node.style)

  if (props) {
    for (const [name, value] of Object.entries(props)) {
      if (name === 'class' || name === 'style') {
        continue
      }

      const attribute = renderPropAttribute(name, value)

      if (attribute) {
        attributes.push(attribute)
      }
    }
  }

  if (classAttribute) {
    attributes.push(classAttribute)
  }

  if (styleAttribute) {
    attributes.push(styleAttribute)
  }

  if (events) {
    for (const [eventName, handler] of Object.entries(events)) {
      attributes.push(renderEventAttribute(eventName, handler))
    }
  }

  return attributes.length > 0 ? ` ${attributes.join(' ')}` : ''
}

function renderTextNode(node: SchemaNode, depth: number): string {
  if (!isTextSchemaNode(node)) {
    throw new Error(`Expected text node, received "${node.type}".`)
  }

  if (!node.style || isEmptyStyle(node.style)) {
    return `${indent(depth)}${escapeText(node.value)}`
  }

  const attributes = renderAttributes(node)

  return `${indent(depth)}<span${attributes}>${escapeText(node.value)}</span>`
}

function renderComponentNode(
  node: ComponentSchemaNode,
  depth: number,
  resolveTagName: ComponentTagNameResolver,
): string {
  const tagName = resolveTagName(node.type)
  assertAttributeName(tagName)

  const attributes = renderAttributes(node)
  const prefix = indent(depth)

  if (node.children.length === 0) {
    return `${prefix}<${tagName}${attributes} />`
  }

  const children = node.children
    .map((child) => renderSchemaNode(child, depth + 1, resolveTagName))
    .join('\n')

  return `${prefix}<${tagName}${attributes}>\n${children}\n${prefix}</${tagName}>`
}

function renderSchemaNode(
  node: SchemaNode,
  depth: number,
  resolveTagName: ComponentTagNameResolver,
): string {
  if (isTextSchemaNode(node)) {
    return renderTextNode(node, depth)
  }

  return renderComponentNode(node, depth, resolveTagName)
}

function indent(depth: number): string {
  return '  '.repeat(depth)
}

function collectImports(
  nodes: readonly SchemaNode[],
  resolveImportSource: ComponentImportSourceResolver,
  imports: ImportGroups,
): void {
  for (const node of nodes) {
    if (!isComponentSchemaNode(node)) {
      continue
    }

    const importSource = resolveImportSource(node.type)

    if (importSource) {
      const components = imports.get(importSource) ?? new Set<string>()
      components.add(node.type)
      imports.set(importSource, components)
    }

    collectImports(node.children, resolveImportSource, imports)
  }
}

function collectEventHandlerIdentifiers(
  nodes: readonly SchemaNode[],
  identifiers: Set<string>,
): void {
  for (const node of nodes) {
    if (!isComponentSchemaNode(node)) {
      continue
    }

    for (const [eventName, handler] of Object.entries(node.events ?? {})) {
      assertEventHandler(eventName, handler)

      if (validHandlerIdentifierPattern.test(handler)) {
        identifiers.add(handler)
      }
    }

    collectEventHandlerIdentifiers(node.children, identifiers)
  }
}

function renderImports(imports: ImportGroups): string {
  return [...imports.entries()]
    .sort(([leftSource], [rightSource]) => leftSource.localeCompare(rightSource))
    .map(([source, components]) => {
      const names = [...components].sort((left, right) => left.localeCompare(right))
      return `import { ${names.join(', ')} } from '${source}'`
    })
    .join('\n')
}

function renderEventHandlerStubs(identifiers: ReadonlySet<string>): string {
  return [...identifiers]
    .sort((left, right) => left.localeCompare(right))
    .map((identifier) => `function ${identifier}(): void {}`)
    .join('\n\n')
}

function renderScriptSetup(imports: ImportGroups, eventHandlers: ReadonlySet<string>): string {
  const blocks = [
    renderImports(imports),
    renderEventHandlerStubs(eventHandlers),
  ].filter(Boolean)

  return `<script setup lang="ts">\n${blocks.join('\n\n')}\n</script>`
}

function renderTemplate(
  page: PageSchema,
  resolveTagName: ComponentTagNameResolver,
): string {
  const body =
    page.children.length > 0
      ? page.children.map((node) => renderSchemaNode(node, 1, resolveTagName)).join('\n')
      : `${indent(1)}<div />`

  return `<template>\n${body}\n</template>`
}

function normalizeOptions(options: GenerateVueSfcOptions): Required<
  Pick<GenerateVueSfcOptions, 'componentImportSource' | 'componentTagName' | 'format'>
> & {
  prettierOptions: VueSfcPrettierOptions
} {
  return {
    componentImportSource: options.componentImportSource ?? defaultComponentImportSource,
    componentTagName: options.componentTagName ?? defaultComponentTagName,
    format: options.format ?? true,
    prettierOptions: {
      ...defaultPrettierOptions,
      ...options.prettierOptions,
    },
  }
}

export function createVueSfcSource(
  page: PageSchema,
  options: GenerateVueSfcOptions = {},
): string {
  const normalizedOptions = normalizeOptions(options)
  const imports: ImportGroups = new Map()
  const eventHandlers = new Set<string>()

  collectImports(page.children, normalizedOptions.componentImportSource, imports)
  collectEventHandlerIdentifiers(page.children, eventHandlers)

  return [
    renderScriptSetup(imports, eventHandlers),
    renderTemplate(page, normalizedOptions.componentTagName),
  ].join('\n\n')
}

export async function generateVueSfc(
  page: PageSchema,
  options: GenerateVueSfcOptions = {},
): Promise<string> {
  const normalizedOptions = normalizeOptions(options)
  const source = createVueSfcSource(page, normalizedOptions)

  if (!normalizedOptions.format) {
    return source
  }

  return format(source, {
    ...normalizedOptions.prettierOptions,
    parser: 'vue',
    plugins: [htmlPlugin, babelPlugin, typescriptPlugin, estreePlugin],
  })
}

export const generateVueSFC = generateVueSfc
