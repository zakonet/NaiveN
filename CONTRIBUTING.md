# Contributing to NaiveN

Thanks for taking the time to work on NaiveN. This project is still young, so clear, focused contributions help more than broad rewrites.

## Set up the project

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run build
```

The build runs `vue-tsc -b` first, so type errors need to be fixed before the Vite build starts.

## How to contribute

1. Pick one small problem or feature.
2. Open an issue if the behavior is unclear or if the change affects the public architecture.
3. Keep schema, registry, renderer, builder UI, and code generation concerns separate.
4. Add or update documentation when the change affects how people use or extend NaiveN.
5. Open a pull request with a short explanation and screenshots for visible UI changes.

## Architecture rules

- Store pages as JSON schema, never as raw HTML.
- Keep schema nodes serializable.
- Register components through the registry. Avoid direct component imports in the canvas.
- Use metadata overrides for better defaults instead of hard-coding behavior per component.
- Keep renderer logic recursive and narrow. It should render schema, not own builder state.
- Use Vue 3 Composition API with `<script setup lang="ts">`.
- Keep TypeScript strict. Do not silence errors with broad `any`.

## Commit messages

Use Conventional Commits:

```text
type(scope): description
```

Examples:

```text
feat(core): add runtime prop inference
fix(renderer): keep resized content scaled
docs: add contribution guide
```

Use these common types:

- `feat` for user-facing features
- `fix` for bug fixes
- `docs` for documentation-only changes
- `refactor` for code structure changes without behavior changes
- `test` for tests
- `build` for dependencies and build setup
- `chore` for maintenance

## Pull request checklist

- [ ] The change has a focused scope.
- [ ] `npm run build` passes.
- [ ] New behavior follows the schema-first model.
- [ ] UI changes work in light and dark themes.
- [ ] Documentation is updated when needed.
- [ ] The PR description explains the reason for the change.
