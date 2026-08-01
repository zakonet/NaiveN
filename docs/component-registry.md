# Component registry

The registry maps schema `type` values to Vue components and editing metadata. It lets the builder discover components without hard-coding every component in the canvas.

## Metadata shape

```ts
interface ComponentMetadata {
  name: string
  label: string
  description: string
  component: Component
  propsSchema: readonly PropertySchema[]
  loadPropsSchema?: () => Promise<readonly PropertySchema[]>
  defaultProps: SchemaProps
  createChildren?: () => SchemaNode[]
  configured: boolean
  source: "naive-ui" | "custom"
}
```

`name` is the schema type, such as `NButton`. `component` is the Vue component used by the renderer. `propsSchema` drives the property panel.

## Naive UI discovery

NaiveN scans Naive UI module declarations from `node_modules/naive-ui/es/*/index.d.ts`, extracts public component names, and creates lazy Vue components from matching `index.mjs` modules.

That gives the palette broad Naive UI coverage without manually listing each component.

## Metadata overrides

Automatic discovery cannot know which defaults make sense in a page builder. Overrides add useful labels, default props, select options, and starter children for common components.

Example:

```ts
NButton: {
  label: 'Button',
  defaultProps: {
    type: 'primary',
    size: 'medium'
  },
  createChildren: () => [createTextNode('Button')]
}
```

Use overrides for design-time quality. Do not add component-specific behavior to the canvas unless the behavior is genuinely about canvas interaction.

## Runtime prop inference

When a component has no override, the property panel can infer editors from the Vue runtime props:

| Runtime prop | Editor |
| --- | --- |
| Boolean | Checkbox |
| Number | Number input |
| String | Text input |
| Object or Array | JSON textarea |

Function props and `onXxx` event props are skipped for now.

## Adding a component

Use `registerComponent`:

```ts
registerComponent({
  name: 'MyWidget',
  label: 'My Widget',
  description: 'Custom project widget',
  component: MyWidget,
  propsSchema: [],
  defaultProps: {},
  configured: true,
  source: 'custom'
})
```

The future plugin API should wrap this function and add lifecycle hooks, package metadata, and optional generator rules.

