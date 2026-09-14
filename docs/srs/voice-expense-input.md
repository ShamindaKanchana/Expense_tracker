# SRS and Architecture Proposal: Voice Expense Input

| Field | Value |
|-------|-------|
| **Product** | Expense Tracker |
| **Feature** | Speak one expense, review the extracted draft, then save through the existing expense API |
| **Status** | **Architecture proposal / awaiting approval** |
| **Branch** | feature/voice-expense-input |
| **Related code** | frontend/src/components/Dashboard.jsx, frontend/src/services/api.js, backend/routes/expenses.js |
| **UI prototypes** | [Open prototype index](../prototypes/voice-expense-input/index.html) |

---

## 1. Agreed product behaviour

Voice input is an alternative entry point; it does not replace or prefill the existing Add Expense form.

The authenticated dashboard shows a small, accessible mic icon. Selecting it opens a compact message-style panel. The user records one expense statement, the app transcribes it, extracts the fields, and displays a review card:

    Description: Lunch at the canteen
    Amount:      2,500.00
    Category:    Food
    Date:        2026-09-14

    [Proceed] [Retry] [Discard]

- **Proceed** opens the final confirmation dialog; **Confirm & save** calls the existing expense API.
- **Retry** records a replacement statement without saving the current result.
- **Discard** closes the flow and saves nothing.
- Inline editing and form prefilling are not required for v1.

### Goals

1. Faster single-expense entry on desktop and mobile.
2. English, Sinhala, and Tamil input.
3. Explicit user review before any database write.
4. No new expense table or save path.
5. Configurable STT and LLM providers with no vendor coupling in expense logic.
6. No provider secrets or direct provider requests in the browser.

### Out of scope for v1

- Multiple expenses in one recording.
- Voice edit, delete, search, or navigation.
- A conversational or multi-turn agent.
- Offline STT, audio retention, or speaker identification.
- A separately deployed voice microservice.

---

## 2. Architecture decision

### Decision: modular Node.js backend

Build the voice pipeline as an isolated module inside the existing Node.js/Express backend. STT and LLM systems are external provider services hidden behind application-owned adapters.

    React dashboard
        |
        | authenticated audio upload
        v
    Node.js / Express
        |
        +-- Voice expense module
        |     +-- request/audio validation
        |     +-- STT adapter
        |     +-- extraction service
        |     +-- LLM adapter
        |     +-- deterministic normalizer/validator
        |
        +-- Existing expense creation path
              +-- POST /api/expenses
              +-- MySQL

This is the recommended v1 boundary because the flow is short and synchronous, shares authentication and the expense domain with the current backend, and does not need independent deployment or scaling. Node.js supports hosted model APIs and runtime schema validation well; Python is not required for this workload.

The module boundaries remain explicit so the pipeline can be extracted later without changing its public contracts.

### When a microservice becomes appropriate

Reconsider a Python/FastAPI or other service only when there is a concrete need such as:

- self-hosted Whisper/PyTorch or GPU inference;
- independently scaled audio processing;
- asynchronous jobs or queues;
- reuse by multiple products;
- different deployment, regional, privacy, or availability requirements.

Python/LangChain familiarity by itself does not justify a second deployment, authentication boundary, and monitoring surface.

### Architecture rules

- The model produces an untrusted draft and can never save an expense.
- The frontend makes one draft request; backend stages remain separately testable.
- Provider SDK types, response formats, and errors remain inside adapters.
- The application owns one canonical extraction schema.
- Structural validation and business validation are separate.
- STT selection is independent of LLM selection.
- Provider changes are server configuration changes.
- Silent cross-provider fallback is disabled by default due to cost and privacy differences.

---

## 3. End-to-end flow

    1. User selects the dashboard mic.
    2. Browser requests microphone permission.
    3. MediaRecorder captures up to 30 seconds.
    4. Browser uploads audio, locale, and IANA time zone.
    5. Backend checks auth, media, size, duration, locale, time zone, and rate limit.
    6. Configured STT adapter returns a transcript.
    7. Empty transcription stops with a retryable error.
    8. Configured LLM adapter extracts a schema-constrained draft.
    9. Backend validates and normalizes the untrusted result.
    10. Backend returns transcript, draft, field statuses, and warnings only.
    11. UI shows all four expense fields.
    12a. Proceed opens the final confirmation dialog; Confirm & save posts the canonical JSON to existing POST /api/expenses.
    12b. Retry starts a new recording without saving.
    12c. Discard removes the in-memory result without saving.
    13. Successful save refreshes normal dashboard expense data.

The manual Add Expense flow stays independent and usable when capture, STT, LLM, or the network is unavailable.

### Language selection contract

The current application language deterministically selects the recognition and extraction language; v1 does not ask the model to guess it:

- English UI uses en-LK where supported, with an evaluated en-US fallback.
- Sinhala UI uses si-LK.
- Tamil UI uses ta-LK.
- The request carries both the app language and recognition locale to the backend.
- Transcript and description remain in the spoken language, while category is normalized to the stored English enum.

### UI states

    idle -> permission -> recording -> processing -> preview
    preview -> proceed -> confirming -> confirm and save -> saving -> success
    preview -> retry -> recording
    preview -> discard -> idle
    any capture/provider stage -> recoverable error

Only valid actions for the current state are enabled. Duplicate clicks must not create duplicate recordings, provider calls, or frontend save requests.

The preview shows the transcript, description, amount, category, date, and useful warnings such as “category inferred” or “date defaulted”. Proceed is disabled when the normalized draft is incomplete.

---

## 4. API contracts

### 4.1 Create a voice expense draft

    POST /api/voice-expenses/draft
    Authorization: Bearer <JWT>
    Content-Type: multipart/form-data

| Part | Rules |
|------|-------|
| audio | Required; allowlisted media; maximum 30 seconds and configured byte limit |
| locale | Allowlisted en-US, si-LK, or ta-LK |
| timezone | Valid IANA zone; backend derives the user's current local date |

Example response:

    {
      "transcript": "Lunch at the canteen 2500 rupees today",
      "draft": {
        "amount": 2500,
        "description": "Lunch at the canteen",
        "category": "Food",
        "date": "2026-09-14"
      },
      "fieldStatus": {
        "amount": "explicit",
        "description": "explicit",
        "category": "inferred",
        "date": "defaulted"
      },
      "warnings": ["CATEGORY_INFERRED", "DATE_DEFAULTED"],
      "complete": true
    }

Contract rules:

- This endpoint never inserts or updates an expense.
- Missing values are null; the model must not invent required details.
- The backend computes complete after validation.
- Field status uses explicit, inferred, defaulted, or missing instead of an unreliable model-generated confidence score.
- The response never exposes raw provider responses, provider errors, or secrets.

Stable error codes include MIC_AUDIO_INVALID, VOICE_TOO_LONG, TRANSCRIPT_EMPTY, STT_UNAVAILABLE, EXTRACTION_UNAVAILABLE, EXTRACTION_INVALID, DRAFT_INCOMPLETE, and RATE_LIMITED. Errors should include a request ID and a retryable flag where meaningful.

### 4.2 Save the reviewed expense

Confirm & save reuses the current authenticated endpoint and exact persisted shape:

    POST /api/expenses

    {
      "amount": 2500,
      "description": "Lunch at the canteen",
      "category": "Food",
      "date": "2026-09-14"
    }

Manual and voice entry must use the same frontend expense service and backend expense creation/validation path. The draft endpoint is not a second save route.

---

## 5. Canonical schema and validation

The model-facing schema is a strict object with exactly these nullable fields:

| Field | Model output | Save rule |
|-------|--------------|-----------|
| amount | Positive number or null | Required, finite, greater than zero, inside DB range |
| description | String or null | Required, trimmed and length-limited; preserve spoken language |
| category | Enum or null | Food, Transport, Entertainment, Bills, Shopping, Construction, Health, Education, Others |
| date | YYYY-MM-DD or null | Valid, not future; missing date defaults to backend-derived local date |

Every key is structurally required but may be null. This reveals missing information instead of forcing the model to invent it.

A clear item may have an inferred category. If no responsible mapping exists, normalization may use Others with CATEGORY_INFERRED. Amount and description are never silently defaulted.

### Two validation layers

1. **Structural:** a Node runtime schema library such as Zod rejects missing/extra keys, wrong types, and invalid categories.
2. **Business:** deterministic code enforces amount, description, category, date, length, range, and future-date rules after extraction and again during POST /api/expenses.

Use provider-native JSON Schema Structured Outputs or function/tool calling when available. If a provider supports only JSON mode, its adapter parses the JSON and runs the same Zod schema. Free-form parsing is a last resort and never bypasses validation.

Refusal, empty response, malformed output, timeout, and incomplete generation are controlled failures.

---

## 6. Configurable provider design

### Provider-neutral interfaces

    TranscriptionProvider.transcribe(audio, locale) -> transcript

    LlmProvider.generateStructured({
      messages,
      schema,
      schemaName
    }) -> provider-neutral object

Adapters for OpenAI, Cohere, DeepSeek, Gemini, or another provider translate this contract into their SDK/API. Provider-specific JSON mode, tool calling, schema options, response parsing, and errors stay in the adapter.

The extraction service—not an adapter—owns the prompt, canonical schema, category rules, and date context. Changing providers therefore cannot change the route, frontend response, expense rules, or save payload.

### Configuration

    STT_PROVIDER=google
    STT_MODEL=<provider-model-id>

    LLM_PROVIDER=cohere
    LLM_MODEL=<provider-model-id>

    LLM_TIMEOUT_MS=15000
    LLM_MAX_RETRIES=1

Each adapter reads only its server credential, such as COHERE_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY. Startup fails clearly if the selected adapter or credential is unavailable.

For v1, changing environment variables followed by a restart/redeploy is sufficient. User-selectable providers and database-stored provider configuration are out of scope.

A factory/registry selects the adapter at startup. Unsupported provider names fail at startup. Fake STT/LLM adapters support tests, and every real adapter passes the same contract suite.

### Framework position

This single-pass pipeline needs no orchestration framework. Direct SDKs behind application-owned adapters plus Zod are the simplest fit.

LangChain.js may be used inside adapters later if it materially reduces integration effort. LangGraph is unnecessary unless the feature gains branching, persistent state, tools, or agent behaviour. Neither framework should become a domain contract.

### No-paid-API evaluation path

A proof of concept can avoid per-call paid APIs, but “free” is an evaluation strategy rather than a production guarantee:

- Browser SpeechRecognition can be used for a browser-specific spike with the selected locale. It requires no application API key, but availability, supported languages, remote processing, privacy, and behavior depend on the browser.
- A self-hosted multilingual speech model can provide Sinhala/Tamil transcription with no STT API charge, but the application still pays for hardware/hosting and must meet latency targets.
- A free-tier/evaluation LLM or a self-hosted multilingual model can extract the four fields, followed by the same strict schema and business validation.
- Provider free tiers and evaluation keys must not be treated as production capacity or availability commitments.

The production architecture remains provider-neutral. The benchmark gate decides whether the first release uses a managed paid provider, a self-hosted provider, or an approved free tier.

### Provider selection

Choose initial providers after a reusable benchmark covering English, Sinhala, Tamil, mixed-language speech, accents, noise, numeric amounts, category inference, and relative dates. Compare:

- transcription and extraction accuracy;
- schema adherence;
- latency and timeout rate;
- cost and quotas;
- retention, training, region, and privacy terms;
- SDK and operational reliability.

Configurability reduces lock-in but does not guarantee equivalent quality. Re-run the benchmark before changing production providers.

---

## 7. Logical module boundaries

    voice route/controller
      -> HTTP, auth, and upload validation

    voice orchestration service
      -> transcriber -> extractor -> normalizer
      -> draft response only

    STT adapter
      -> provider SDK and errors

    LLM adapter
      -> provider SDK, structured output, and errors

    extraction service
      -> prompt, schema, category/date context

    expense normalizer/domain validator
      -> deterministic rules and completeness

    expense creation service
      -> shared by manual and confirmed-voice saves

Exact filenames are an implementation detail. These responsibility boundaries are the future microservice extraction seam.

---

## 8. Security, privacy, and reliability

- Explain microphone use before or with the permission prompt.
- Audio is ephemeral and removed immediately after transcription.
- Do not log audio, transcripts, or raw model output.
- Validate actual media content/type and limits, not only its filename.
- Require JWT, per-user/IP rate limits, timeouts, and bounded retries.
- Keep prompts on the server and treat transcript text only as user data.
- The LLM cannot choose routes, save data, call arbitrary tools, or generate SQL.
- Send providers only the minimum audio/text needed.
- Review retention, training, region, and deletion terms before production.
- Telemetry may record request ID, provider/model, duration, outcome, and usage without spoken content.
- Upgrade the repository's Node 14 minimum to a supported LTS before using current provider SDKs.

Target p95 from recording stop to preview is under 8 seconds on normal 4G, measured for the selected provider combination.

---

## 9. Testing and acceptance

### Required test layers

- Schema tests for valid, incomplete, extra-key, wrong-type, invalid-category, invalid-date, and future-date output.
- Normalization tests for numeric formats, relative dates, local date near UTC midnight, inference, trimming, and DB ranges.
- Shared provider contract tests with fake adapters by default and opt-in real-provider integration tests.
- Route tests for auth, media/size limits, locale/time-zone validation, rate limits, timeouts, and safe errors.
- UI state tests for Proceed, confirmation, Confirm & save, Retry, Discard, permission denial, duplicate actions, and manual fallback.
- Reusable EN/SI/TA and code-switching benchmark corpus.
- End-to-end proof that Confirm & save submits through POST /api/expenses and behaves like manual entry.

### Acceptance criteria

- [ ] Dashboard mic opens the panel without opening or prefilling Add Expense.
- [ ] One expense can be previewed in representative EN/SI/TA cases.
- [ ] Preview shows description, amount, category, and date.
- [ ] Missing/invalid data disables Proceed and offers Retry/Discard.
- [ ] Recording, processing, preview, retry, and discard perform no DB write.
- [ ] Proceed opens the final dialog; Confirm & save uses the existing expense contract and the result appears in existing views.
- [ ] Selected STT and LLM adapters pass the same contracts.
- [ ] Provider/model changes require configuration only.
- [ ] Frontend contains no provider secret or direct provider call.
- [ ] Logs contain no audio, transcript, or raw model response.
- [ ] Manual entry works unchanged when voice is unavailable.
- [ ] No DB migration is required.

---

## 10. Architecture approval gates

Do not begin feature implementation until Gates 1 and 2 are approved.

### Gate 1: product flow

- Dashboard mic and message-style panel.
- One expense per recording.
- Preview only; no form prefill or inline editing in v1.
- Proceed, final confirmation, Confirm & save, Retry, and Discard.

### Gate 2: technical contracts

- Modular Node.js monolith.
- Draft and save API contracts.
- Nullable extraction schema and deterministic validation.
- Independent STT/LLM adapters and configuration.
- Privacy, timeout, upload, and rate-limit boundaries.

### Gate 3: provider benchmark

- Create the EN/SI/TA test corpus.
- Compare candidate STT and LLM providers.
- Record initial STT_PROVIDER/STT_MODEL and LLM_PROVIDER/LLM_MODEL.

### Gate 4: implementation plan

Only after the earlier gates should work be split into backend adapters/contracts, shared expense validation, frontend states/UI, tests, telemetry, and rollout.

---

## 11. Open decisions

| # | Decision | Proposed default |
|---|----------|------------------|
| 1 | Initial STT provider/model | Select after EN/SI/TA benchmark |
| 2 | Initial LLM provider/model | Select after accuracy/schema/latency/cost/privacy benchmark |
| 3 | Preview editing | No editing in v1; Retry or Discard |
| 4 | Accepted codecs and byte limit | Decide after MediaRecorder browser testing |
| 5 | Supported browsers | Chrome/Edge desktop and Android Chrome baseline; test Safari |
| 6 | Cross-provider fallback | Disabled |
| 7 | Server idempotency for Confirm & save | Recommended before broad rollout |

---

## 12. Repository and reference notes

- Existing manual entry sends amount, description, category, and date to POST /api/expenses. Voice Confirm & save preserves that contract.
- Current backend validation is basic; the shared save path must enforce the stricter category, date, and range rules above.
- Official OpenAI documentation describes JSON Schema Structured Outputs as stricter than JSON-only mode. An OpenAI adapter can use it, but it is not an architecture dependency: <https://developers.openai.com/api/reference/cli/resources/beta/subresources/responses>.

---

## 13. Change log

| Date | Change |
|------|--------|
| 2026-09-14 | Initial proposal: client-side prototype, mic in Add Expense, form prefill |
| 2026-09-14 | Reworked: dashboard preview, Proceed/Retry/Discard, no form prefill, Node modular monolith, server provider adapters, strict validation, independently configurable STT/LLM |
