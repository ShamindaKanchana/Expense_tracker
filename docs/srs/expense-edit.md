# SRS: Expense Edit and Delete

| Field | Value |
|-------|-------|
| **Product** | Expense Tracker |
| **Feature** | Edit/delete recent expenses from the Dashboard and Monthly Report |
| **Status** | Implemented |
| **Depends on** | [monthly-expense-list.md](./monthly-expense-list.md) |
| **Related docs** | [../api.md](../api.md), [../database.md](../database.md), [../development.md](../development.md) |

---

## 1. Purpose

Let users correct a mistake immediately after adding an expense — a wrong amount,
category, description, or date — without deleting and re-creating the record.

Editing is limited to a **24-hour window from `created_at`** so corrections are
easy while the entry is still fresh, without turning the expense history into an
open ledger. Deleting is **not** time-limited: users can always remove an
incorrect old record.

---

## 2. User experience

### 2.1 Scope and placement

| Screen | Placement |
|--------|-----------|
| Dashboard (`/dashboard`) | Pencil/trash icon buttons in the **Recent Expenses** table (`/api/expenses/recent`) |
| Monthly Report (`/monthly-expenses`) | Pencil/trash icon buttons in each row of the expanded expense list (`/api/expenses/list`) |

Dashboard covers the latest 5 records; the Monthly Report list covers every record in the selected month. The Reports page (`/reports`) is intentionally read-only in this version.

### 2.2 Edit flow

| Step | Behavior |
|------|----------|
| Open | Clicking the pencil opens a modal prefilled with amount, category, description, and date. |
| Validate | Same rules as Add Expense: positive amount (max 2 decimals), category required, non-empty description, date on or before today. |
| Save | Send `PUT /api/expenses/:id`; show a saving state; close on success. |
| Refresh | The affected list, charts, monthly totals, and summary counters refresh automatically. |
| Error | Keep the modal open and show the server/validation message inline. |

### 2.3 Edit window

| Condition | Behavior |
|-----------|----------|
| `created_at` within the last 24 hours | Pencil is enabled. |
| `created_at` older than 24 hours | Pencil is hidden; delete remains available. |
| Direct API call after the window | `PUT` returns `403` with code `EXPENSE_EDIT_WINDOW_EXPIRED`. |
| Date changed into another month/year | Record moves to the new period after refresh; the current list reloads. |

The window is based on the record's **`created_at`**, not the expense `date`, and
is enforced **server-side**. The UI only reflects the server-provided
`editable` flag.

### 2.4 Delete flow

| Step | Behavior |
|------|----------|
| Click | Trash icon asks for confirmation. |
| Confirm | Send `DELETE /api/expenses/:id`; refresh the affected lists/summaries. |
| Cancel | Close the confirmation without a request. |
| Error | Show an inline error; keep the row visible. |

### 2.5 Edge and responsive states

| Condition | Behavior |
|-----------|----------|
| No actions available | Table renders without the Actions column. |
| Mobile / narrow screens | Icon buttons remain tappable (min 40px target); table scrolls horizontally inside its wrapper, never the page. |
| Missing `editable` field | Treat as not editable (safe default). |
| Concurrent delete | `404` from the API shows "This expense no longer exists" and refreshes the list. |

---

## 3. Functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **EXP-EDIT-UI-01** | Dashboard Recent Expenses shall show edit/delete actions per row. | Must |
| **EXP-EDIT-UI-02** | Monthly Report expense list shall show edit/delete actions per row. | Must |
| **EXP-EDIT-UI-03** | Edit shall open a prefilled modal with amount, category, description, and date. | Must |
| **EXP-EDIT-UI-04** | The modal shall validate fields with the same rules as Add Expense. | Must |
| **EXP-EDIT-UI-05** | The pencil shall be disabled/hidden when the server marks the record not editable. | Must |
| **EXP-EDIT-UI-06** | Delete shall require explicit confirmation before calling the API. | Must |
| **EXP-EDIT-UI-07** | Successful edit/delete shall refresh the affected list, charts, and totals without a full page reload. | Must |
| **EXP-EDIT-UI-08** | All new UI strings shall be available in English, Sinhala, and Tamil. | Must |
| **EXP-EDIT-UI-09** | The modal shall be keyboard accessible (focusable controls, Escape closes, labelled dialog). | Should |
| **EXP-EDIT-UI-10** | The Reports page shall remain read-only in this version. | Must |

---

## 4. API requirements

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/expenses/recent` | Private | Latest 5 expenses; includes `created_at` + `editable` |
| `GET` | `/api/expenses/list` | Private | Paginated records; includes `created_at` + `editable` |
| `PUT` | `/api/expenses/:id` | Private | Update an owned expense inside the edit window |
| `DELETE` | `/api/expenses/:id` | Private | Delete an owned expense at any time |

### Rules

| ID | Requirement | Priority |
|----|-------------|----------|
| **EXP-EDIT-API-01** | `GET /expenses/recent` and `GET /expenses/list` shall return `created_at` and a boolean `editable`. | Must |
| **EXP-EDIT-API-02** | `editable` shall be computed server-side from `created_at` and the edit-window setting. | Must |
| **EXP-EDIT-API-03** | `PUT /expenses/:id` shall return `404` when the record does not exist or belongs to another user. | Must |
| **EXP-EDIT-API-04** | `PUT /expenses/:id` shall return `403` with code `EXPENSE_EDIT_WINDOW_EXPIRED` after the window closes. | Must |
| **EXP-EDIT-API-05** | `PUT` shall retain the existing body schema: positive amount, valid category, non-empty description, optional date. | Must |
| **EXP-EDIT-API-06** | `DELETE /expenses/:id` shall remain available regardless of the edit window. | Must |
| **EXP-EDIT-API-07** | Both mutations shall enforce ownership with `WHERE id = ? AND user_id = ?`. | Must |

### Configuration

| Variable | Default | Notes |
|----------|---------|-------|
| `EXPENSE_EDIT_WINDOW_HOURS` | `24` | Non-negative number; `0` disables editing entirely. |

---

## 5. Data requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **EXP-EDIT-DATA-01** | Edit eligibility shall use the existing `expenses.created_at` column; no schema change is required. | Must |
| **EXP-EDIT-DATA-02** | Updating an expense shall update `updated_at` via the existing `ON UPDATE CURRENT_TIMESTAMP`. | Should |

---

## 6. Security and privacy

| ID | Requirement | Priority |
|----|-------------|----------|
| **EXP-EDIT-SEC-01** | The edit window shall be enforced in the API, never only in the UI. | Must |
| **EXP-EDIT-SEC-02** | Error responses shall not leak records owned by other users (`404` for both missing and unauthorized). | Must |
| **EXP-EDIT-SEC-03** | Decrypted descriptions shall only be returned to the owning user, matching existing list behavior. | Must |

---

## 7. Verification checklist

- [ ] Dashboard recent rows show a pencil only within 24 hours.
- [ ] Monthly list rows show a pencil only within 24 hours.
- [ ] Editing amount, category, description, and date updates the UI after save.
- [ ] Changing the date across a month/year updates the monthly totals and list.
- [ ] `PUT` after 24 hours returns `403` / `EXPENSE_EDIT_WINDOW_EXPIRED`.
- [ ] `PUT` for another user's expense returns `404`.
- [ ] Delete works at any age and refreshes the UI.
- [ ] Reports page remains read-only.
- [ ] EN/SI/TA strings render without missing-key fallbacks.
- [ ] Mobile layout keeps action buttons usable without page-wide horizontal scroll.

---

## 8. Out of scope (v1)

- Editing from the Reports page.
- Bulk edit/delete.
- Undo/history for edits.
- Admin override of the edit window.
- Full audit trail of changed fields.
