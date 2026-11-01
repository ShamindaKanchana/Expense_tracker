# SRS: Date-Range Reports

| Field | Value |
|-------|-------|
| **Product** | Expense Tracker |
| **Feature** | Custom date-range spending report |
| **Status** | Implementation in progress |
| **Depends on** | [monthly-expense-list.md](./monthly-expense-list.md) |
| **Related docs** | [../api.md](../api.md), [../database.md](../database.md), [../development.md](../development.md) |

---

## 1. Purpose

Give users a way to analyse spending over **any date range** (a single day, this week, this month, last 7/30 days, or a fully custom range) without being limited to a month/year selector.

The report reuses existing aggregation and listing endpoints so it stays consistent with Dashboard and Monthly Report and requires no new routes.

---

## 2. User experience

### 2.1 Scope and placement

| Screen | Placement |
|--------|-----------|
| Reports (`/reports`) | New page linked from the desktop navbar and the mobile bottom navigation |

### 2.2 Range selection

| Control | Behavior |
|---------|----------|
| Presets | **Today**, **This week** (Mon–Sun), **This month**, **Last 7 days**, **Last 30 days** |
| Custom | Selecting **Custom** enables the start/end date inputs and the **Apply** button |
| Date inputs | Native `<input type="date">`, constrained by `min`/`max` so the end cannot precede the start |
| Apply | Re-fetches aggregation and resets the expense list to page 1 |
| Preset selection | Immediately applies the computed range (no Apply needed) |

### 2.3 Report content

| Section | Content |
|---------|---------|
| Summary | Total spent, transaction count, and the active range |
| By category | Donut chart (top 6 categories + **Other**) and a full category breakdown with amount and percentage |
| Transactions | Paginated expense list (10 per page) with date, category, and amount |

### 2.4 Empty and edge states

| Condition | Behavior |
|-----------|----------|
| No expenses in range | Show "No expenses in this range." and hide the chart/list |
| API error | Show an inline error message; do not crash |
| Invalid range (start > end or missing bound) | Show a validation message under the controls; do not fetch |
| Single day | `startDate === endDate`; that day is fully included |

---

## 3. Functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **RPT-UI-01** | The app shall provide a Reports page at `/reports`, reachable from the navbar and mobile bottom navigation. | Must |
| **RPT-UI-02** | The page shall offer presets: Today, This week, This month, Last 7 days, Last 30 days, and Custom. | Must |
| **RPT-UI-03** | Presets shall use the user's local calendar dates (no UTC day shift). | Must |
| **RPT-UI-04** | Custom mode shall expose start/end date inputs and an Apply action. | Must |
| **RPT-UI-05** | Selecting a preset shall apply the range immediately. | Must |
| **RPT-UI-06** | The page shall show total spent, transaction count, and the active range. | Must |
| **RPT-UI-07** | The page shall show a category donut and a full category breakdown with amounts and percentages. | Must |
| **RPT-UI-08** | The page shall show a paginated expense list (10 per page) sorted by date descending. | Must |
| **RPT-UI-09** | Changing the range shall reset the list to page 1. | Must |
| **RPT-UI-10** | The page shall show validation, empty, loading, and error states. | Must |
| **RPT-UI-11** | All new UI strings shall be available in English, Sinhala, and Tamil. | Must |

---

## 4. API requirements

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/expenses/categories` | Private | Category aggregation for the range |
| `GET` | `/api/expenses/list` | Private | Paginated expense records for the range |

### Query parameters

| Param | Required | Notes |
|-------|----------|-------|
| `startDate` | No | Inclusive start date (`YYYY-MM-DD`). Must be sent with `endDate`. |
| `endDate` | No | Inclusive end date (`YYYY-MM-DD`). All timestamps on this day are included. |
| `page` | No | List only; default `1` |
| `limit` | No | List only; default `10`, max `50` |

### Rules

| ID | Requirement | Priority |
|----|-------------|----------|
| **RPT-API-01** | Both endpoints shall accept an inclusive `startDate`/`endDate` range. | Must |
| **RPT-API-02** | When range params are present they shall take precedence over `month`/`year`. | Must |
| **RPT-API-03** | Date params shall be validated as real calendar dates in `YYYY-MM-DD`, and `startDate <= endDate`; otherwise return `400`. | Must |
| **RPT-API-04** | Omitting both range params shall preserve existing month/year behavior (backward compatible). | Must |
| **RPT-API-05** | The range filter shall be applied in SQL (`date >= ? AND date < DATE_ADD(?, INTERVAL 1 DAY)`), not client-side. | Must |

---

## 5. Data requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **RPT-DATA-01** | An index on `expenses (user_id, date)` shall exist to keep range filtering efficient. | Should |
| **RPT-DATA-02** | Index creation shall be idempotent on every server boot (checked via `information_schema`). | Should |

---

## 6. Verification checklist

- [ ] Presets compute the expected local-date range (single day, Mon–Sun week, calendar month).
- [ ] Custom range with `startDate === endDate` returns that day's expenses.
- [ ] `startDate > endDate` returns `400` from both endpoints.
- [ ] Missing one bound returns `400`.
- [ ] Invalid dates (e.g. `2026-02-30`) return `400`.
- [ ] Month/year requests without range params behave exactly as before.
- [ ] Category totals and list contents agree for the same range.
- [ ] Pagination resets to page 1 on range change.
- [ ] EN/SI/TA strings render without missing-key fallbacks.
- [ ] Mobile layout (≤639px) stacks cards without horizontal page scroll.
