# Software Requirements Specifications (SRS)

Product requirements that guide design and implementation. These are **not** deployment runbooks (see [../deployment/](../deployment/)).

| Document | Status | Description |
|----------|--------|-------------|
| [admin-panel.md](./admin-panel.md) | Prototype on `main` / extend on `dev` | Admin panel: account overview, hidden admin login, delete accounts |
| [password-reset-admin-approval.md](./password-reset-admin-approval.md) | **Draft** | Forgot password → admin approve → one-time code → user sets new password |
| [monthly-expense-list.md](./monthly-expense-list.md) | **Implemented** | Monthly report: on-demand paginated expense list for a selected month/year |
| [date-range-reports.md](./date-range-reports.md) | **Implemented** | Custom date-range report: presets/custom range → category donut + paginated expense list |
| [expense-edit.md](./expense-edit.md) | **Implemented** | Edit/delete recent expenses from Dashboard + Monthly Report, with a server-enforced 24-hour edit window |
| [voice-expense-input.md](./voice-expense-input.md) | **Implementation in progress** | Voice input: mic → browser STT → LLM draft preview → confirm → reuse POST /api/expenses |
| [playstore-data-safety.md](./playstore-data-safety.md) | **Living checklist** | Play Store readiness: current shipped controls, remaining risk register, and submission release gates |
| [spending-insights.md](./spending-insights.md) | **Deferred — future** | Spending insights and amount-aware advice; deferred because the project is open source/free and cannot absorb per-user LLM API costs |

## How to use

1. Agree requirements in these docs before coding.
2. When implementing, open a feature branch / work on `dev` and reference the SRS section IDs.
3. Mark requirements as implemented in release notes when shipped.
