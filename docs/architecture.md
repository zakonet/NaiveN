# Architecture

NaiveN is built around one rule: the page is data. The builder stores a serializable schema, renders that schema in the canvas, and later turns the same schema into Vue SFC code.

## Main modules

```text
src
|-- core
|   |-- types.ts      Shared schema and registry types
|   |-- schema.ts     Node creation and traversal helpers
|   `-- registry.ts   Component registration and Naive UI discovery
|-- renderer
|   `-- ComponentRenderer.vue
|-- builder
|   |-- Builder.vue
|   |-- Canvas.vue
|   `-- ComponentPanel.vue
|-- property
|   `-- PropertyPanel.vue
|-- generator
|   `-- vue.ts
`-- stores
    `-- builder.ts
```

## Data flow

```text
Component registry
        |
        v
Palette item -> Schema node -> Builder store -> Canvas renderer
                                      |
                                      v
                              Property panel
                                      |
                                      v
                             Vue SFC generator
```

The registry owns component metadata. The store owns the active page schema and history. The renderer reads schema and turns nodes into Vue components. The property panel edits schema values through store actions.

## Boundaries

- `core` must stay framework-light. It can use Vue component types, but schema data must remain JSON-safe.
- `renderer` should render recursive nodes and expose builder hooks. It should not own global builder state.
- `builder` owns layout, drag-and-drop, selection, and canvas actions.
- `property` reads registry metadata and writes schema updates.
- `generator` converts schema into code. It should not depend on canvas-only state.

## Extension points

NaiveN currently exposes `registerComponent` from `src/core/registry.ts`. The long-term plugin API should build on that shape instead of adding a parallel component system.

Expected plugin abilities:

- Register Vue components with metadata.
- Provide default schema nodes.
- Define property editors.
- Add code generation rules when a component needs custom imports or slots.

## Design constraints

- Store pages as schema, not HTML.
- Keep schema nodes serializable.
- Do not store live component references inside schema.
- Prefer registry metadata over canvas-specific branches.
- Keep generated Vue code readable and editable.

