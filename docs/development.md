# Development guide

This guide covers the local workflow for contributors working on NaiveN.

## Requirements

- Node.js 24 or newer
- npm
- A browser supported by Vite development servers

## Setup

```bash
npm install
npm run dev
```

Vite prints the local development URL after the server starts.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

`npm run build` runs `vue-tsc -b` before Vite. Treat type errors as build failures, not warnings.

## Working on builder features

- Start with the schema shape first.
- Add registry metadata before adding canvas behavior.
- Keep drag-and-drop logic in the builder layer.
- Keep recursive rendering in `ComponentRenderer.vue`.
- Keep property editing driven by metadata or runtime prop inference.

## Working on generated code

Generated output should be plain Vue 3 SFC code:

- Use `<script setup lang="ts">`.
- Import only components used by the schema.
- Keep Tailwind classes in `class`.
- Format with Prettier.
- Do not leak builder-only state into exported code.

## Manual checks

Before opening a pull request:

```bash
npm run build
```

For UI changes, also check:

- Drag a component from the palette into the canvas.
- Select it and edit at least one prop.
- Switch between light and dark theme.
- Resize a selected component.
- Confirm undo and redo still work.

