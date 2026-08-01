<p align="center">
  <img src="public/favicon.svg" alt="NaiveN logo" width="80" height="80" />
</p>

<h1 align="center">NaiveN</h1>

<p align="center">
  A visual low-code page builder for Vue 3, Naive UI, and TailwindCSS.
</p>

NaiveN lets users drag Naive UI components onto a canvas, edit component props, preview the page, and export Vue 3 Single File Component code. The project is early, but the base architecture is already built around JSON schema, a component registry, recursive rendering, and editable component state.

> [!NOTE]
> NaiveN is in active v0.x development. The current app is useful for testing the builder architecture, but the generated code workflow is still being built.

## What works today

- Schema-first page model. Pages are stored as JSON nodes, not HTML strings.
- Automatic Naive UI component registration with lazy component loading.
- Component palette with search and drag-and-drop from `vue-draggable-plus`.
- Canvas rendering through a recursive Vue renderer.
- Inspector that edits component props from metadata or runtime Naive UI props.
- Undo and redo for page schema changes through VueUse history.
- Dark and light theme switching.
- Window-style component resizing and schema-backed scale controls.
- Page building blocks such as layout, top bar, tabs, page header, menu, card, space, button, and input.

## Tech stack

- Vue 3 with `<script setup>`
- TypeScript
- Vite
- Naive UI
- TailwindCSS v4
- VueUse
- vue-draggable-plus
- Monaco Editor
- Prettier

## Quick start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

Build the production bundle:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project structure

```text
src
|-- builder
|   |-- Builder.vue
|   |-- Canvas.vue
|   `-- ComponentPanel.vue
|-- core
|   |-- registry.ts
|   |-- schema.ts
|   `-- types.ts
|-- generator
|   `-- vue.ts
|-- property
|   `-- PropertyPanel.vue
|-- renderer
|   `-- ComponentRenderer.vue
`-- stores
    `-- builder.ts
```

## Architecture

NaiveN uses a JSON schema as the source of truth. A component node stores its id, type, props, children, style, and events. Text is also represented as a schema node.

```ts
{
  id: 'button-1',
  type: 'NButton',
  props: {
    type: 'primary',
    size: 'large'
  },
  children: [
    {
      id: 'text-1',
      type: 'text',
      value: 'Save'
    }
  ]
}
```

The component registry connects schema `type` values to Vue components. Naive UI components are discovered automatically from the installed package, then loaded lazily when the renderer needs them. Hand-written metadata is still useful for better defaults, select options, and page-ready component presets.

The renderer does one job: turn schema nodes into Vue components. Builder-specific behavior such as selection, drag sorting, and resizing lives outside the Naive UI components so exported pages can stay clean.

## More documentation

- [Architecture](docs/architecture.md)
- [Schema model](docs/schema.md)
- [Component registry](docs/component-registry.md)
- [Development guide](docs/development.md)
- [Roadmap](docs/roadmap.md)
- [Release guide](docs/release.md)

## Roadmap

| Version | Scope |
| --- | --- |
| v0.1 | Schema, registry, palette, drag-and-drop canvas, recursive renderer |
| v0.2 | Inspector, runtime prop editing, common page structure presets |
| v0.3 | Vue SFC generation, Monaco preview, formatting with Prettier |
| v0.4 | Plugin system and third-party component registration |
| v1.0 | Stable low-code builder for Naive UI projects |

## Development notes

- Keep page state serializable. Do not store live Vue components in schema nodes.
- Prefer metadata overrides over special cases in the canvas.
- Keep generated code as normal Vue SFC output, not framework-specific runtime state.
- Use strict TypeScript and Composition API patterns.

For security reports and project support, contact `contact@zako.net.cn`.
