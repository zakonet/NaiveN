# Schema model

The schema is the source of truth for every page. It describes component type, props, children, style, events, and ids without storing rendered HTML.

## Page schema

```ts
interface PageSchema {
  version: 1
  id: string
  name: string
  children: SchemaNode[]
}
```

`version` exists so future migrations can update old saved pages.

## Component node

```ts
interface ComponentSchemaNode {
  id: string
  type: string
  props: SchemaProps
  children: SchemaNode[]
  style?: SchemaStyle
  events?: SchemaEvents
}
```

Example:

```json
{
  "id": "button-1",
  "type": "NButton",
  "props": {
    "type": "primary",
    "size": "large"
  },
  "children": [
    {
      "id": "text-1",
      "type": "text",
      "value": "Save"
    }
  ]
}
```

## Text node

```ts
interface TextSchemaNode {
  id: string
  type: "text"
  value: string
  style?: SchemaStyle
}
```

Text uses the same node tree as components. This keeps rendering, selection, and code generation recursive.

## Props

Props must be JSON-safe:

```ts
type SchemaValue =
  | string
  | number
  | boolean
  | null
  | SchemaValue[]
  | { [key: string]: SchemaValue }
```

Do not store functions, symbols, classes, refs, or Vue component instances in `props`.

## Style

`style.class` stores Tailwind classes. Other keys map to inline CSS values.

```json
{
  "style": {
    "class": "p-4 rounded-lg",
    "width": "320px",
    "height": "180px"
  }
}
```

Builder-only resize metadata should stay in `style` only when the exported page needs the same visual size.

## Events

Events are reserved for code generation and future behavior editing.

```json
{
  "events": {
    "click": "handleSave"
  }
}
```

Event values are names or references, not executable code. The builder should not run user-authored event bodies at design time.

## Migration rule

When schema changes, add a migration path instead of silently changing stored data. The current schema version is `1`.

