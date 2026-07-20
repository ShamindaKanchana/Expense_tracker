# Software Requirements Specifications (SRS)

Product requirements that guide design and implementation. These are **not** deployment runbooks (see [../deployment/](../deployment/)).

| Document | Status | Description |
|----------|--------|-------------|
| [admin-panel.md](./admin-panel.md) | Prototype on `main` / extend on `dev` | Admin panel: account overview, hidden admin login, delete accounts |
| [password-reset-admin-approval.md](./password-reset-admin-approval.md) | **Draft** | Forgot password → admin approve → one-time code → user sets new password |

## How to use

1. Agree requirements in these docs before coding.
2. When implementing, open a feature branch / work on `dev` and reference the SRS section IDs.
3. Mark requirements as implemented in release notes when shipped.
