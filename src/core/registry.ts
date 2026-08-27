import { defineAsyncComponent, type Component } from 'vue'

import naiveComponentManifest from 'virtual:naive-ui-component-manifest'

import { createComponentNode, createTextNode } from './schema'
import type {
  ComponentMetadata,
  ComponentMetadataOverride,
  ComponentPaletteItem,
  PropertyEditorType,
  PropertySchema,
  SchemaNode,
  SchemaValue,
} from './types'

class ComponentRegistry {
  private readonly components = new Map<string, ComponentMetadata>()

  registerComponent(metadata: ComponentMetadata): void {
    if (this.components.has(metadata.name)) {
      throw new Error(`Component "${metadata.name}" is already registered.`)
    }

    this.components.set(metadata.name, metadata)
  }

  upsertComponent(metadata: ComponentMetadata): void {
    this.components.set(metadata.name, metadata)
  }

  mergeMetadata(name: string, override: ComponentMetadataOverride): void {
    const metadata = this.getComponent(name)

    if (!metadata) {
      throw new Error(`Component "${name}" is not registered.`)
    }

    this.components.set(name, {
      ...metadata,
      ...override,
      configured: true,
    })
  }

  getComponent(name: string): ComponentMetadata | undefined {
    return this.components.get(name)
  }

  hasComponent(name: string): boolean {
    return this.components.has(name)
  }

  listComponents(): ComponentMetadata[] {
    return [...this.components.values()].sort((left, right) => {
      if (left.configured !== right.configured) {
        return left.configured ? -1 : 1
      }

      return left.label.localeCompare(right.label)
    })
  }

  listPaletteItems(): ComponentPaletteItem[] {
    return this.listComponents().map(({ name, label, description, configured }) => ({
      type: name,
      label,
      description,
      configured,
    }))
  }

  createNode(name: string): SchemaNode {
    const metadata = this.getComponent(name)

    if (!metadata) {
      throw new Error(`Component "${name}" is not registered.`)
    }

    return createComponentNode(
      metadata.name,
      metadata.defaultProps,
      metadata.createChildren?.() ?? [],
    )
  }
}

type RuntimePropDefinition =
  | Function
  | Function[]
  | {
      type?: Function | Function[]
      default?: unknown
    }
type RuntimeProps = Record<string, RuntimePropDefinition | unknown> | string[]

export const componentRegistry = new ComponentRegistry()

function component(
  type: string,
  props: Record<string, SchemaValue | undefined> = {},
  children: SchemaNode[] = [],
  style?: Record<string, string | number | undefined>,
): SchemaNode {
  const node = createComponentNode(type, props, children)

  if (style) {
    node.style = style
  }

  return node
}

function text(value: string): SchemaNode {
  return createTextNode(value)
}

type NaiveLoaderModule = typeof import('./naive-loaders')
let naiveLoaderModulePromise: Promise<NaiveLoaderModule> | undefined

function loadNaiveLoaderModule(): Promise<NaiveLoaderModule> {
  return (naiveLoaderModulePromise ??= import('./naive-loaders'))
}

function loadNaiveModule(modulePath: string): ReturnType<NaiveLoaderModule['loadNaiveModule']> {
  return loadNaiveLoaderModule().then(({ loadNaiveModule: load }) => load(modulePath))
}

function toReadableLabel(name: string): string {
  return name
    .replace(/^N/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim()
}

function toReadablePropLabel(name: string): string {
  const label = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim()

  return label ? label[0].toUpperCase() + label.slice(1) : name
}

function createNaiveComponentMetadata(name: string, component: Component): ComponentMetadata {
  const label = toReadableLabel(name)

  return {
    name,
    label,
    description: `${label} component from Naive UI`,
    component,
    propsSchema: [],
    loadPropsSchema: undefined,
    defaultProps: {},
    configured: false,
    source: 'naive-ui',
  }
}

function getFunctionName(value: unknown): string | undefined {
  return typeof value === 'function' ? value.name : undefined
}

function normalizePropTypes(definition: RuntimePropDefinition | unknown): string[] {
  if (Array.isArray(definition)) {
    return definition.map(getFunctionName).filter((name): name is string => Boolean(name))
  }

  if (typeof definition === 'function') {
    return [definition.name]
  }

  if (definition && typeof definition === 'object' && 'type' in definition) {
    const type = (definition as { type?: Function | Function[] }).type
    const types = Array.isArray(type) ? type : [type]

    return types.map(getFunctionName).filter((name): name is string => Boolean(name))
  }

  return []
}

function getPropDefault(definition: RuntimePropDefinition | unknown): unknown {
  if (definition && typeof definition === 'object' && 'default' in definition) {
    return (definition as { default?: unknown }).default
  }

  return undefined
}

function inferEditorType(
  definition: RuntimePropDefinition | unknown,
): PropertyEditorType | undefined {
  const types = normalizePropTypes(definition)
  const defaultValue = getPropDefault(definition)

  if (types.includes('Function')) {
    return undefined
  }

  if (types.includes('Boolean') || typeof defaultValue === 'boolean') {
    return 'boolean'
  }

  if (types.includes('Number') || typeof defaultValue === 'number') {
    return 'number'
  }

  if (types.includes('String') || typeof defaultValue === 'string') {
    return 'text'
  }

  if (
    types.includes('Object') ||
    types.includes('Array') ||
    Array.isArray(defaultValue) ||
    (defaultValue !== null && typeof defaultValue === 'object')
  ) {
    return 'json'
  }

  return undefined
}

function toSchemaDefaultValue(
  editorType: PropertyEditorType,
  defaultValue: unknown,
): SchemaValue | undefined {
  if (typeof defaultValue === 'function' || defaultValue === undefined) {
    return editorType === 'boolean' ? false : undefined
  }

  if (
    defaultValue === null ||
    typeof defaultValue === 'string' ||
    typeof defaultValue === 'number' ||
    typeof defaultValue === 'boolean'
  ) {
    return defaultValue
  }

  if (Array.isArray(defaultValue) || typeof defaultValue === 'object') {
    return JSON.parse(JSON.stringify(defaultValue)) as SchemaValue
  }

  return undefined
}

function shouldExposeProp(name: string, definition: RuntimePropDefinition | unknown): boolean {
  if (/^on[A-Z]/.test(name)) {
    return false
  }

  return Boolean(inferEditorType(definition))
}

function inferPropsSchema(component: Component): PropertySchema[] {
  const runtimeProps = (component as { props?: RuntimeProps }).props

  if (!runtimeProps) {
    return []
  }

  if (Array.isArray(runtimeProps)) {
    return runtimeProps.map((name) => ({
      name,
      label: toReadablePropLabel(name),
      type: 'text',
    }))
  }

  return Object.entries(runtimeProps)
    .filter(([name, definition]) => shouldExposeProp(name, definition))
    .map(([name, definition]) => {
      const type = inferEditorType(definition) ?? 'text'
      const defaultValue = toSchemaDefaultValue(type, getPropDefault(definition))

      return {
        name,
        label: toReadablePropLabel(name),
        type,
        ...(defaultValue !== undefined ? { defaultValue } : {}),
      }
    })
}

function createAsyncNaiveComponent(
  name: string,
  modulePath: string,
): Component {
  return defineAsyncComponent(async () => {
    const module = await loadNaiveModule(modulePath)
    const component = module[name]

    if (!component) {
      throw new Error(`Naive UI component "${name}" was not exported by its module.`)
    }

    return component as Component
  })
}

async function loadNaivePropsSchema(
  name: string,
  modulePath: string,
): Promise<PropertySchema[]> {
  const module = await loadNaiveModule(modulePath)
  const component = module[name]

  if (!component) {
    return []
  }

  return inferPropsSchema(component as Component)
}

export function registerNaiveUIComponents(): void {
  for (const { name, modulePath } of naiveComponentManifest) {
    const component = createAsyncNaiveComponent(name, modulePath)

    componentRegistry.upsertComponent(
      {
        ...createNaiveComponentMetadata(name, component),
        loadPropsSchema: () => loadNaivePropsSchema(name, modulePath),
      },
    )
  }
}

const naiveMetadataOverrides: Record<string, ComponentMetadataOverride> = {
  NButton: {
    label: 'Button',
    description: 'Action trigger',
    defaultProps: {
      type: 'primary',
      size: 'medium',
    },
    propsSchema: [
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        options: ['default', 'tertiary', 'primary', 'info', 'success', 'warning', 'error'],
        defaultValue: 'primary',
      },
      {
        name: 'size',
        label: 'Size',
        type: 'select',
        options: ['tiny', 'small', 'medium', 'large'],
        defaultValue: 'medium',
      },
      {
        name: 'disabled',
        label: 'Disabled',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'loading',
        label: 'Loading',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    createChildren: () => [createTextNode('Button')],
  },
  NInput: {
    label: 'Input',
    description: 'Text input control',
    defaultProps: {
      placeholder: 'Type something',
      size: 'medium',
    },
    propsSchema: [
      {
        name: 'placeholder',
        label: 'Placeholder',
        type: 'text',
        defaultValue: 'Type something',
      },
      {
        name: 'size',
        label: 'Size',
        type: 'select',
        options: ['small', 'medium', 'large'],
        defaultValue: 'medium',
      },
      {
        name: 'disabled',
        label: 'Disabled',
        type: 'boolean',
        defaultValue: false,
      },
    ],
  },
  NCard: {
    label: 'Card',
    description: 'Content container',
    defaultProps: {
      title: 'Card title',
      bordered: true,
    },
    propsSchema: [
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        defaultValue: 'Card title',
      },
      {
        name: 'bordered',
        label: 'Bordered',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    createChildren: () => [createTextNode('Card content')],
  },
  NSpace: {
    label: 'Space',
    description: 'Flexible layout container',
    defaultProps: {
      vertical: false,
      size: 'medium',
      align: 'start',
    },
    propsSchema: [
      {
        name: 'vertical',
        label: 'Vertical',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'size',
        label: 'Size',
        type: 'select',
        options: ['small', 'medium', 'large'],
        defaultValue: 'medium',
      },
      {
        name: 'align',
        label: 'Align',
        type: 'select',
        options: ['start', 'end', 'center', 'baseline'],
        defaultValue: 'start',
      },
    ],
    createChildren: () => [createTextNode('Drop components here')],
  },
  NLayout: {
    label: 'Page Layout',
    description: 'Page shell with header and content',
    defaultProps: {
      hasSider: false,
    },
    propsSchema: [
      {
        name: 'hasSider',
        label: 'Has sider',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    createChildren: () => [
      component('NLayoutHeader', {}, [
        component(
          'NSpace',
          {
            align: 'center',
            justify: 'space-between',
          },
          [
            component('NGradientText', { type: 'success' }, [text('NaiveN')]),
            component('NSpace', { align: 'center', size: 'large' }, [
              component('NButton', { quaternary: true }, [text('Docs')]),
              component('NButton', { quaternary: true }, [text('Templates')]),
              component('NButton', { type: 'primary' }, [text('Publish')]),
            ]),
          ],
        ),
      ], {
        padding: '16px 24px',
      }),
      component('NLayoutContent', {}, [
        component('NCard', { title: 'Hero section', bordered: true }, [
          component('NSpace', { vertical: true, size: 'large' }, [
            component('NH1', {}, [text('Build pages visually')]),
            component('NP', {}, [text('Drag components, edit props, and export Vue SFC code.')]),
            component('NButton', { type: 'primary', size: 'large' }, [text('Get started')]),
          ]),
        ]),
      ], {
        padding: '24px',
      }),
    ],
  },
  NLayoutHeader: {
    label: 'Top Bar',
    description: 'Application top navigation bar',
    defaultProps: {
      bordered: true,
    },
    propsSchema: [
      {
        name: 'bordered',
        label: 'Bordered',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    createChildren: () => [
      component(
        'NSpace',
        {
          align: 'center',
          justify: 'space-between',
        },
        [
          component('NGradientText', { type: 'success' }, [text('NaiveN')]),
          component('NSpace', { align: 'center', size: 'medium' }, [
            component('NButton', { quaternary: true }, [text('Home')]),
            component('NButton', { quaternary: true }, [text('Pricing')]),
            component('NButton', { type: 'primary' }, [text('Sign in')]),
          ]),
        ],
      ),
    ],
  },
  NLayoutContent: {
    label: 'Content Area',
    description: 'Main page content region',
    defaultProps: {},
    propsSchema: [],
    createChildren: () => [
      component('NCard', { title: 'Content block' }, [text('Drop page content here.')]),
    ],
  },
  NTabs: {
    label: 'Tabs',
    description: 'Tabbed content section',
    defaultProps: {
      type: 'line',
      animated: true,
    },
    propsSchema: [
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        options: ['line', 'card', 'bar', 'segment'],
        defaultValue: 'line',
      },
      {
        name: 'animated',
        label: 'Animated',
        type: 'boolean',
        defaultValue: true,
      },
    ],
    createChildren: () => [
      component('NTabPane', { name: 'overview', tab: 'Overview' }, [
        component('NCard', { bordered: false }, [text('Overview content')]),
      ]),
      component('NTabPane', { name: 'details', tab: 'Details' }, [
        component('NCard', { bordered: false }, [text('Details content')]),
      ]),
    ],
  },
  NTabPane: {
    label: 'Tab Pane',
    description: 'Single tab panel',
    defaultProps: {
      name: 'tab',
      tab: 'Tab',
    },
    propsSchema: [
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        defaultValue: 'tab',
      },
      {
        name: 'tab',
        label: 'Tab label',
        type: 'text',
        defaultValue: 'Tab',
      },
    ],
    createChildren: () => [text('Tab content')],
  },
  NMenu: {
    label: 'Navigation Menu',
    description: 'Navigation menu with editable option JSON',
    defaultProps: {
      mode: 'horizontal',
      options: [
        {
          label: 'Home',
          key: 'home',
        },
        {
          label: 'Docs',
          key: 'docs',
        },
        {
          label: 'Components',
          key: 'components',
        },
      ],
    },
    propsSchema: [
      {
        name: 'mode',
        label: 'Mode',
        type: 'select',
        options: ['horizontal', 'vertical'],
        defaultValue: 'horizontal',
      },
      {
        name: 'options',
        label: 'Options',
        type: 'json',
        defaultValue: [
          {
            label: 'Home',
            key: 'home',
          },
          {
            label: 'Docs',
            key: 'docs',
          },
          {
            label: 'Components',
            key: 'components',
          },
        ],
      },
    ],
  },
  NPageHeader: {
    label: 'Page Header',
    description: 'Page title and subtitle header',
    defaultProps: {
      title: 'Page title',
      subtitle: 'Subtitle',
    },
    propsSchema: [
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        defaultValue: 'Page title',
      },
      {
        name: 'subtitle',
        label: 'Subtitle',
        type: 'text',
        defaultValue: 'Subtitle',
      },
    ],
  },
}

registerNaiveUIComponents()

for (const [name, override] of Object.entries(naiveMetadataOverrides)) {
  componentRegistry.mergeMetadata(name, override)
}

export const registerComponent = (metadata: ComponentMetadata): void => {
  componentRegistry.registerComponent(metadata)
}
