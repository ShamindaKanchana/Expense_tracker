# Releases

Version history for the Expense Tracker application.

Each release note describes:

- **Release number** (semantic version)
- **Date** (approximate ship window)
- **Summary** vs the previous release
- **Features**, **bug fixes**, **docs**, and **deployment** notes

## Current release

| Field | Value |
|-------|--------|
| **Version** | **[0.3.0](./v0.3.0.md)** |
| **Status** | Current |
| **Git tag** | [`v0.3.0`](https://github.com/ShamindaKanchana/Expense_tracker/releases/tag/v0.3.0) |
| **GitHub release** | [Expense Tracker v0.3.0](https://github.com/ShamindaKanchana/Expense_tracker/releases/tag/v0.3.0) |
| **Git (approx)** | Tag `v0.3.0` → `33c3d1e` (includes Navbar CI fix; release re-published) |

## Release index

| Version | Date | Title | Compared to |
|---------|------|--------|-------------|
| [0.3.0](./v0.3.0.md) | 2026-07 | Account, username auth, auth UX, docs, deploy fixes | 0.2.0 |
| [0.2.0](./v0.2.0.md) | 2026-07 | Env config, Render prep, auth error UX, local/dev docs | 0.1.0 |
| [0.1.0](./v0.1.0.md) | Earlier | Baseline app (dashboard, expenses, JWT, multi-user) | — |

## How to maintain this log

When you ship a meaningful batch of work:

1. **Bump the version** using [Semantic Versioning](https://semver.org/):
   - **MAJOR** (`1.0.0`) — breaking API or product changes
   - **MINOR** (`0.x.0`) — new features, backward compatible
   - **PATCH** (`0.x.y`) — bug fixes and small docs only
2. **Add** `docs/releases/vX.Y.Z.md` using the template below.
3. **Update** this README: set **Current release** and add a row to the index.
4. **Link** from [docs/README.md](../README.md) (already listed).
5. Optionally tag git: `git tag v0.3.0 && git push origin v0.3.0`.

### Template for a new release file

```markdown
# Release vX.Y.Z

**Date:** YYYY-MM-DD  
**Previous release:** [vA.B.C](./vA.B.C.md)

## Summary vs previous release

One short paragraph: what this release adds or fixes compared to the last one.

## Features

- ...

## Bug fixes

- ...

## Documentation

- ...

## Deployment / infrastructure

- ...

## Upgrade notes

- Any env vars, migrations, or user-facing changes operators should know.

## Related issues / commits

- Issues: #…
- Notable commits: `abc1234`
```

## Related docs

- [API reference](../api.md)
- [Database schema](../database.md)
- [Development](../development.md)
- [Deployment](../deployment/README.md)
