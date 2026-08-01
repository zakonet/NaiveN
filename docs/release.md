# Release guide

NaiveN uses Conventional Commits and keeps user-facing release notes in `CHANGELOG.md`.

## Versioning

Before v1.0, minor versions can still include breaking changes. Document them clearly.

Recommended version mapping:

| Change | Version impact |
| --- | --- |
| Breaking schema or plugin API change | Major after v1.0, minor before v1.0 |
| New feature | Minor |
| Bug fix | Patch |
| Documentation only | No release required unless bundled with other changes |

## Release checklist

1. Confirm the current branch is clean except release changes.
2. Run `npm run build`.
3. Update `CHANGELOG.md`.
4. Update the package version.
5. Review schema migrations if `PageSchema.version` changes.
6. Create a Git tag.
7. Publish release notes from the changelog entry.

## Changelog format

Use clear sections:

```md
## 0.2.0 - 2026-08-01

### Added

- Add runtime prop inference for unconfigured Naive UI components.

### Fixed

- Keep resized component content scaled with the selected node.
```

Keep entries about behavior. Avoid listing internal file moves unless they affect contributors or users.

