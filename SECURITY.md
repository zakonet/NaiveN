# Security policy

## Supported versions

NaiveN is in pre-1.0 development. Security fixes are applied to the main development line unless a stable release branch exists.

| Version | Supported |
| --- | --- |
| 0.x | Yes |

## Reporting a vulnerability

Please do not open a public issue for a security vulnerability.

Send the report to `contact@zako.net.cn`. Include:

- A short description of the issue.
- Steps to reproduce it.
- Affected versions or commits, if known.
- Any proof of concept code.
- The impact you believe the issue has.

Maintainers should acknowledge a valid report within 7 days when possible. A fix timeline depends on severity and project capacity.

## Security expectations

- Do not store secrets in schema nodes, generated code, examples, or screenshots.
- Treat imported component metadata as untrusted input when plugin support lands.
- Keep generated Vue output explicit and reviewable.
- Avoid executing user-authored code during design-time rendering.
