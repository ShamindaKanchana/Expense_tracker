# SRS: Spending Insights & Personalized Advice (Deferred)

| Field | Value |
|-------|--------|
| **Product** | Expense Tracker |
| **Feature** | Spending insights and amount-aware personalized advice |
| **Status** | **Deferred — not implemented.** Future backlog item; not part of the first Play Store release. |
| **Depends on** | [monthly-expense-list.md](./monthly-expense-list.md), [date-range-reports.md](./date-range-reports.md), [playstore-data-safety.md](./playstore-data-safety.md) |
| **Related docs** | [database.md](../database.md), [api.md](../api.md), [security.md](../security.md), [privacy-policy.md](../privacy-policy.md) |
| **Goal** | Help users understand where their money goes and receive practical, explainable suggestions without adding recurring API cost or sending financial data to a free LLM tier. |

> Status note: this document records a deliberately deferred feature. It does
> not authorize implementation. Requirements here are for future planning only.

---

## 1. Why this is deferred

- **No recurring API budget.** The project is open source and offered to users
  at no cost. Per-user LLM inference for personalized advice would create an
  ongoing infrastructure/API bill with no matching revenue.
- **Free LLM tiers are not suitable for production financial data.** Cohere's
  trial API key is rate-limited, not permitted for production or commercial
  use, and trial inputs/outputs may be used for research and model improvement
  with no documented trial opt-out or DPA. Spending amounts and category
  patterns are financial/personal data.
- **Privacy exposure is disproportionate.** Sending transaction data to an LLM
  would increase the Play Data Safety sharing surface for a convenience
  feature. The existing voice feature already discloses Cohere use; this
  feature should not expand that exposure by default.
- **A no-cost version is possible later.** Category shares, trends, averages,
  and threshold warnings can be computed deterministically from the user's own
  data. That should be the first implementation step when the feature is
  scheduled.

## 2. Intended future scope

- Top categories by amount and percentage of total spend.
- Month-over-month and rolling 3-month category trends.
- Average daily/weekly spend and spending frequency.
- Largest single expense or largest category for a period.
- Simple budget/threshold warnings when a user-defined limit is exceeded.
- Short, personalized advice generated from deterministic rules and localized
  templates.
- English, Sinhala, and Tamil output aligned with the rest of the app.

## 3. Explicitly out of scope

- Investment, credit, tax, legal, or medical advice.
- Automatic changes to budgets or expenses without user confirmation.
- Sending raw descriptions, merchant names, account identifiers, email
  addresses, usernames, or exact transaction dates to an LLM.
- Using free/trial LLM API keys in production.
- Hidden profiling, advertising, or sale of spending data.
- Real-time bank/transaction integrations.

## 4. Privacy and provider decision

### 4.1 Default implementation

- Compute insights server-side or on-device from the authenticated user's own
  rows.
- No third-party LLM or analytics processor receives transaction data.
- No new Play Data Safety "sharing" declaration is required if data remains
  inside the app's existing backend.

### 4.2 Optional LLM-assisted advice (future, disabled by default)

An LLM may only be used if all of the following are true:

- A paid/production provider plan is in place.
- A DPA or equivalent contractual data-protection terms are available.
- Training opt-out and, preferably, zero data retention are enabled.
- The user explicitly opts in to AI-generated advice.
- Only aggregated, de-identified summaries are sent. Preferred payload:
  category shares, trend direction, and coarse amount bands. Never raw
  descriptions, merchant names, email, username, or exact dates.
- The privacy policy and Play Data Safety form are updated before release.
- The deterministic insight remains available without opting in.

Cohere's free/trial API does **not** satisfy these conditions for production
use. See [Cohere Pricing](https://cohere.com/pricing),
[Privacy Policy §2.3](https://cohere.com/privacy), and
[Enterprise Data Commitments](https://cohere.com/enterprise-data-commitments).

## 5. Requirements

Legend: `[ ]` = not implemented; all items are deferred.

### A — Insight computation

- [ ] **INS-01 Local insight engine.** Compute insights from the authenticated
  user's expenses without a third-party API call.
- [ ] **INS-02 Category breakdown.** Return top categories with amount, share
  of total, and comparison to the previous period.
- [ ] **INS-03 Trend detection.** Report material month-over-month changes
  with an explicit comparison window.
- [ ] **INS-04 Spending cadence.** Report average daily/weekly spend and
  transaction frequency for the selected period.
- [ ] **INS-05 Largest item.** Identify the largest expense or category without
  exposing unrelated users' data.
- [ ] **INS-06 Budget warnings.** Compare user-defined limits against actual
  spend; do not auto-adjust limits.
- [ ] **INS-07 Insufficient-data handling.** Show a neutral empty state when
  there are too few expenses for a meaningful comparison.

### B — Advice generation

- [ ] **INS-08 Template-based advice.** Generate advice from reviewed,
  localized templates using only computed facts.
- [ ] **INS-09 Explainability.** Every advice sentence must be traceable to a
  displayed number, category, or trend; no invented amounts.
- [ ] **INS-10 No sensitive logs.** Do not log amounts, descriptions, category
  shares, or generated advice in production.
- [ ] **INS-11 Optional LLM flag.** Any LLM-assisted path is feature-flagged,
  disabled by default, consent-gated, and fails back to deterministic advice.
- [ ] **INS-12 Disclosure.** If LLM sharing is enabled, update the privacy
  policy and Data Safety form before enabling it for users.

### C — Security and performance

- [ ] **INS-13 Ownership isolation.** Every query filters by `user_id` from the
  JWT; no cross-user aggregation.
- [ ] **INS-14 Rate limit and caching.** Rate-limit insight generation and
  cache results per user/period to avoid repeated computation.
- [ ] **INS-15 Encrypted-description independence.** Insights must work from
  amount/category/date only; decryption is not required for v1 insights.
- [ ] **INS-16 Cost guardrail.** No per-user recurring paid API call in the
  default path.

## 6. Data sources

| Data | Use | Notes |
|------|-----|-------|
| `expenses.amount` | Totals, averages, shares, trends | Plaintext by decision (`ENC-06`); never log |
| `expenses.category` | Category breakdown and advice | Existing enum |
| `expenses.date` | Period comparisons and cadence | Timezone-aware aggregation |
| `expenses.description` | Not required for v1 | Keep encrypted; do not send to LLM |
| User-defined budget | Threshold warnings | Future schema addition; not in v1 |

## 7. Acceptance criteria

1. A user with enough data sees top categories, shares, and a comparison to the
   previous period.
2. Advice references only numbers and categories shown in the same response.
3. No transaction data leaves the app backend in the default implementation.
4. No amount, description, or generated advice appears in production logs.
5. A user with too little data sees a neutral empty state, not a misleading
   comparison.
6. English, Sinhala, and Tamil render correctly and keep category names
   synchronized with the app.
7. If an LLM path is ever enabled, it is opt-in, documented, and disabled by
   default.
8. The endpoint is authenticated, rate-limited, and cannot aggregate another
   user's data.

## 8. Future implementation order

1. Add read-only aggregation queries and tests.
2. Add deterministic insight rules and i18n templates.
3. Add UI cards on Dashboard/Reports.
4. Measure usage and cost (zero in the default path).
5. Only then evaluate a paid, DPA-backed LLM provider and consent flow.

## 9. Open questions

1. Should budgets be user-defined per category, overall monthly, or both?
2. Should insights be computed on demand or cached nightly?
3. What is the minimum data threshold for trend comparisons?
4. If an LLM is added later, which paid provider and DPA/ZDR terms are
   acceptable?
5. Does enabling any LLM path require a new Play Data Safety review and privacy
   policy version?

---

*Changelog: 2026-11-14 — created as a deferred future-feature SRS. No code is
implemented. Records the no-cost/open-source constraint and the decision not to
use free/trial LLM APIs for production financial data.*
