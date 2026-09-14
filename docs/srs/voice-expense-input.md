# SRS: Voice Expense Input (Proposal)

| Field | Value |
|-------|--------|
| **Product** | Expense Tracker |
| **Feature** | Voice-to-expense: speak expense details, confirm, save via existing expense API |
| **Status** | **Proposal / Draft** |
| **Branch intent** | Prototype on feature branch, merge to `dev` after acceptance |
| **Related docs** | [../development.md](../development.md), [../api.md](../api.md), [../database.md](../database.md) |
| **Related code** | `frontend/src/components/AddExpense.jsx`, `frontend/src/services/api.js`, `backend/routes/expenses.js` |

---

## 1. Purpose

Add an **alternative to manual form filling** on Add Expense: user taps/hovers a **mic icon**, speaks (e.g. "Lunch 2500 rupees, food, today"), the app converts voice to structured expense data, shows it for **confirmation**, then saves through the **same path as the form**.

Goals:

1. Faster entry on mobile/desktop without typing amount, description, category, date.
2. Reuse existing validation + storage — **no new DB schema**.
3. Support app languages: **English / Sinhala / Tamil**.
4. Never auto-save uncertain LLM output — user always confirms.

Non-goal for v1: offline voice, multi-expense in one utterance ("lunch 500 and bus 200" splits later), voice editing/deleting.

---

## 2. Recommended approach (design idea)

### 2.1 Pipeline (agreed direction)

```
Mic press/hold → audio capture → STT (speech-to-text)
  → NLU (LLM extracts amount, description, category, date)
  → prefill AddExpense form + confidence display
  → user Confirm/Edit → POST /api/expenses (existing)
```

| Stage | v1 (prototype) | Later |
|-------|----------------|-------|
| Capture | `MediaRecorder` + mic button in `AddExpense.jsx` (click to start/stop, hold-to-talk on mobile) | Noise cancel, offline fallback |
| STT | Browser `webkitSpeechRecognition` (free, no key, `lang` from i18n) | Whisper API (`openai/whisper`) for better SI/TA accuracy |
| NLU | Client calls LLM (Gemini/OpenAI) with JSON mode, whitelisted categories | Server endpoint `POST /api/expenses/parse-voice` to hide API key |
| Save | Reuse `api.post('/expenses', {...})` — identical JSON to form submit | Batch/multi-expense support |

**v1 recommendation:** STT + LLM client-side prototype, prefill + confirm. No backend change except optional parse endpoint in v2.

### 2.2 Why prefill + confirm (not direct save)

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Prefill form + Confirm button** | User fixes LLM errors; reuses existing validation; trusted | One extra tap | **Preferred for v1** |
| Direct auto-save on voice end | Fastest | Wrong amount/category saved silently; hard to undo | Not preferred |
| Voice-only modal, no form shown | Clean | Duplicates validation logic | Later if needed |

### 2.3 UI sketch

```
Add Expense
┌─────────────────────────────────┐
│ Amount [____]  [🎙 Voice]       │  ← mic next to amount, hover tooltip
│ Category [____]                 │
│ Description [____]              │
│ Date [____]                     │
│                                 │
│ Voice preview (after parse):    │
│ "Lunch 2500, Food, 2026-09-14"  │
│ confidence: high/medium/low     │
│ [Use voice data] [Discard]      │
│                                 │
│ [Cancel] [Add Expense]          │
└─────────────────────────────────┘

Recording state: pulsing mic + "Listening… (EN/සිං/த) [Stop]"
Error state: "Couldn't hear that — try again" / "No amount found"
```

Mobile: same card, mic large enough for touch, hold-to-talk optional.

### 2.4 Data contract (must match form)

Form today posts (`AddExpense.jsx`):

```json
{
  "amount": 2500,
  "description": "lunch at canteen",
  "category": "Food",
  "date": "2026-09-14"
}
```

Voice NLU **must** output exactly this shape:

| Field | Rules |
|-------|-------|
| `amount` | Positive number, float. Parse "two thousand five hundred", "රුපියල් 2500", "₹2500". Reject if missing/<=0. |
| `description` | Trimmed non-empty string. Keep user wording; do not translate. |
| `category` | **Must** be one of 9 English keys: `Food, Transport, Entertainment, Bills, Shopping, Construction, Health, Education, Others`. Map synonyms ("meal"→Food, "bus"→Transport). Default `Others` with low confidence if unsure. |
| `date` | `YYYY-MM-DD`. Default today. Parse "today", "yesterday", "last Monday", "ඊයේ", "நேற்று". Never future beyond today. |

Backend `POST /api/expenses` validation (`backend/routes/expenses.js`) already enforces amount>0, description/category non-empty — voice output flows through it unchanged.

Example LLM system prompt (conceptual):

> Extract expense JSON. Categories only from [Food, Transport, ...]. Return JSON only: {amount, description, category, date}. Language of speech may be en/si/ta. Today is {today}.

---

## 3. Functional requirements

### 3.1 Capture

| ID | Requirement | Priority |
|----|-------------|----------|
| **VOI-CAP-01** | Add Expense shall show a mic button with accessible label + tooltip in all 3 languages. | Must |
| **VOI-CAP-02** | Press starts recording, press again/Stop ends it; UI shows listening state + language used. | Must |
| **VOI-CAP-03** | If mic permission denied or unsupported browser, shall show fallback message and keep manual form usable. | Must |
| **VOI-CAP-04** | Recording longer than 60s shall auto-stop. | Should |

### 3.2 STT

| ID | Requirement | Priority |
|----|-------------|----------|
| **VOI-STT-01** | STT language shall follow current i18n (`en-US` / `si-LK` / `ta-LK`). | Must |
| **VOI-STT-02** | Raw transcript shall be shown to user (collapsible) for transparency. | Should |
| **VOI-STT-03** | Empty/inaudible result shall show retry message, not proceed to NLU. | Must |

### 3.3 NLU / extraction

| ID | Requirement | Priority |
|----|-------------|----------|
| **VOI-NLU-01** | NLU shall return `{amount, description, category, date}` only; no extra fields. | Must |
| **VOI-NLU-02** | `category` shall be one of the 9 whitelisted keys; else `Others` with low confidence. | Must |
| **VOI-NLU-03** | Missing amount or description shall mark result incomplete and prompt user to speak again or type. | Must |
| **VOI-NLU-04** | Date default today (`YYYY-MM-DD`); relative dates resolved against device date. | Must |
| **VOI-NLU-05** | Confidence (high/medium/low) + which fields were inferred shall be displayed. | Should |

### 3.4 Confirm + save

| ID | Requirement | Priority |
|----|-------------|----------|
| **VOI-SAVE-01** | Parsed data shall **prefill** the existing AddExpense form; user presses Add Expense to save. | Must |
| **VOI-SAVE-02** | Save shall call existing `POST /api/expenses` with identical JSON + auth header; no new save path. | Must |
| **VOI-SAVE-03** | Backend validation errors shall surface in the same form error UI as manual entry. | Must |
| **VOI-SAVE-04** | Discard button shall clear voice data without touching manually typed values unless user opts in. | Should |

### 3.5 i18n

| ID | Requirement | Priority |
|----|-------------|----------|
| **VOI-I18N-01** | Mic labels, listening/stop/retry/confirm strings in EN/SI/TA via existing `react-i18next`. | Must |
| **VOI-I18N-02** | Category stored in DB stays English key; UI shows translated label (existing rule). | Must |

---

## 4. Non-functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **VOI-NFR-01** | No new tables/columns; reuse `expenses` schema. | Must |
| **VOI-NFR-02** | LLM/STT API keys never in frontend source in production — use env (`REACT_APP_*`) for prototype, server proxy for v2. | Must |
| **VOI-NFR-03** | p95 voice-to-prefill < 8s on 4G (excluding user speech time). | Should |
| **VOI-NFR-04** | Audio not stored by default; transcript kept only in-memory unless user opts to log. | Must |
| **VOI-NFR-05** | Works in Chrome/Edge desktop + Android Chrome; graceful degrade in Firefox/Safari (manual form). | Must |
| **VOI-NFR-06** | Cost guard: max ~30s audio / request, debounce mic, show error on quota fail. | Should |

---

## 5. Out of scope (v1)

- Splitting multiple expenses from one utterance.
- Voice edit/delete/list ("delete last lunch").
- Offline STT, custom wake-word.
- Speaker identification.
- Server-side audio storage or training on user voice.

---

## 6. API requirements (conceptual)

v1: **no new backend API**. Reuses:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/expenses` | User JWT | Save confirmed voice expense (same as form) |

v2 (optional, to hide LLM key):

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/expenses/parse-voice` | User JWT | Accepts `{transcript, lang, today}` → returns `{amount, description, category, date, confidence}`. Never writes DB. |

---

## 7. Data & privacy notes

- Mic requires explicit browser permission each origin; explain why before first use.
- Do not upload audio unless user consented and STT provider requires it; prefer on-device/browser STT for prototype.
- Transcripts may contain personal spending info — treat like expense descriptions; no logging in v1.
- Production LLM provider DPA/region to be decided before storing any voice data.

---

## 8. Acceptance criteria (proposal accepted / prototype done when)

- [ ] Mic button on Add Expense works in EN + one of SI/TA.
- [ ] "Lunch 2500 rupees food today" (or SI/TA equivalent) prefills amount/description/category/date correctly.
- [ ] Wrong/uncertain parse shows low confidence and does not auto-save.
- [ ] Confirmed voice expense appears in dashboard/recent/monthly same as manual one.
- [ ] Manual form still works with mic disabled/denied.
- [ ] No DB migration; no new required env in production except optional LLM key.

---

## 9. Implementation sketch (non-binding)

1. `frontend/src/components/VoiceExpenseButton.jsx` — capture + STT, emits transcript.
2. `frontend/src/services/voiceParse.js` — transcript → LLM JSON (whitelist categories, today injection).
3. Extend `AddExpense.jsx` — mic UI, preview, Use/Discard, prefill `formData`.
4. i18n keys `voice.*` in `frontend/src/i18n/`.
5. (v2) `backend/routes/expenses.js` + `POST /parse-voice` proxy.

---

## 10. Open decisions

| # | Question | Default if not decided |
|---|----------|------------------------|
| 1 | STT provider for SI/TA quality? | Prototype browser STT; eval Whisper if accuracy low |
| 2 | LLM provider/key storage? | Env-based client call for prototype; server proxy for prod |
| 3 | Hold-to-talk vs toggle? | Toggle (click start/stop); hold optional on mobile |
| 4 | Multi-expense utterances? | Out of scope v1 — take first expense only |

---

## 11. Change log

| Date | Change |
|------|--------|
| 2026-09-14 | Initial proposal: voice capture → STT → LLM extract → prefill + confirm → reuse POST /api/expenses |
