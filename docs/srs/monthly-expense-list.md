# SRS: Monthly Expense List

| Field | Value |
|-------|--------|
| **Product** | Expense Tracker |
| **Feature** | Monthly expense list (on-demand, paginated) |
| **Status** | Draft |
| **Depends on** | [admin-panel.md](./admin-panel.md), [password-reset-admin-approval.md](./password-reset-admin-approval.md) |
| **Related docs** | [../api.md](../api.md), [../database.md](../database.md), [../development.md](../development.md) |

---

## 1. Purpose

Allow a user to **view individual expense records** for a selected month and year from the Monthly Report page.

The list must be **on-demand** (not always visible) so the UI stays scannable:
- Show charts and category breakdown by default.
- Provide a **toggle button** to expand/collapse the expense list.
- Load the list only when the user requests it.

---

## 2. User experience

### 2.1 Scope and placement

| Screen | Placement |
|--------|-----------|
| Monthly Report (`/monthly-expenses`) | Inside the existing **category breakdown** card, below the category detail rows |

### 2.2 Behavior

| State | Behavior |
|-------|----------|
| Default | Category breakdown (donut + detail cards) is visible. A **View Expenses** button is shown below the details. |
| Expanded | Expense list table + pagination appears below the button. Button label changes to **Hide Expenses**. |
| Collapsed | List is hidden. Button label changes back to **View Expenses**. |
| Month change | If the list is visible, it refreshes for the newly selected month/year. |
| Year change | If the list is visible, it refreshes for the newly selected year. |

### 2.3 Empty and edge states

| Condition | Behavior |
|-----------|----------|
| Selected month has no expenses | Hide the list section entirely (no button shown). |
| API returns empty array | Show "No expenses found for this month." |
| API error | Show an inline error message without crashing the page. |

---

## 3. Functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **MEL-UI-01** | Monthly Report shall provide a **View Expenses** action inside the category breakdown card when the selected month has at least one expense. | Must |
| **MEL-UI-02** | Clicking the action shall **expand** an expense list table below the category details. | Must |
| **MEL-UI-03** | The action shall **toggle** between **View Expenses** and **Hide Expenses**. | Must |
| **MEL-UI-04** | The expense list shall be **paginated** (default 10 items per page). | Must |
| **MEL-UI-05** | Pagination controls shall show current page, total pages, and Prev/Next buttons. | Must |
| **MEL-UI-06** | Changing the selected month or year while the list is visible shall **refresh** the list for the new filter. | Must |
| **MEL-UI-07** | If the selected month has **zero expenses**, the list toggle shall not be shown. | Must |
| **MEL-UI-08** | The list table shall display: **#**, **date**, **category**, **amount** (and **description** if space allows). | Must |
| **MEL-UI-09** | The list shall be sorted by **date descending** (newest first). | Must |
| **MEL-UI-10** | The implementation shall not force the user to scroll past charts to reach the list; the list is hidden until requested. | Must |

---

## 4. API requirements

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/expenses/list` | Private | Paginated expense records, optionally filtered by month/year |

### Query parameters

| Param | Required | Notes |
|-------|----------|-------|
| `month` | No | Month number (`01`–`12`) |
| `year` | No | Four-digit year; use together with `month` |
| `page` | No | Page number (default `1`) |
| `limit` | No | Items per page (default `10`, max `50`) |

### Response shape

```json
{
  "success": true,
  "expenses": [
    {
      "id": 12,
      "description": "Bus fare",
      "category": "Transport",
      "date": "2026-07-15T10:30:00.000Z",
      "amount": 250.00
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

**Rules:**
- `expenses` is an empty array when no records match.
- `date` is returned as an ISO timestamp.
- `amount` is a JSON number.
- Pagination `total` is the total matching record count.
- Responses never expose password hashes or other user fields.

---

## 5. Non-functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **MEL-NFR-01** | The list endpoint shall use database indexes on `user_id`, `date`, and month/year expressions where available. | Should |
| **MEL-NFR-02** | The frontend shall not pre-fetch the list on initial page load; it shall fetch only after the user clicks **View Expenses**. | Must |
| **MEL-NFR-03** | Large result sets shall be paginated server-side; the frontend shall not request unbounded data. | Must |

---

## 6. Out of scope (v1)

- Inline editing or deleting expenses from the list
- Sorting/filtering the list client-side
- Exporting the list (CSV/PDF)
- Sharing or linking directly to an expanded list state

---

## 7. Acceptance criteria (v1 done when)

- [ ] Monthly Report shows **View Expenses** only when the selected month has expenses
- [ ] Clicking the button expands a paginated expense list below the category breakdown
- [ ] Pagination works (Prev / Next / page info)
- [ ] Changing month/year while expanded refreshes the list
- [ ] Zero-expense months do not show the toggle button
- [ ] API documented at `GET /api/expenses/list`
- [ ] UI stays scannable: charts remain visible without extra scroll by default

---

## 8. Implementation order

1. Backend route `GET /api/expenses/list` with month/year filter + pagination
2. Frontend toggle button + conditional fetch
3. Frontend table + pagination UI
4. CSS for list section, table, and pagination controls
5. Trilingual translation keys
6. API docs update
7. This SRS update

---

## 9. Open decisions

| # | Question | Default if not decided |
|---|----------|------------------------|
| 1 | Default page size? | 10 |
| 2 | Max page size? | 50 |
| 3 | Button text style? | "View Expenses" / "Hide Expenses" |
| 4 | Table columns on narrow screens? | Horizontal scroll within the card |

---

## 10. Change log

| Date | Change |
|------|--------|
| 2026-08-11 | Initial draft: on-demand toggle, paginated list, API shape, acceptance criteria |
