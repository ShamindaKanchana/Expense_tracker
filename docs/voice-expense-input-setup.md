# Voice Expense Input: Local Setup and Provider Configuration

The first implementation uses the browser's SpeechRecognition API for speech-to-text and the existing Node.js backend for structured expense extraction. Chrome or Edge on localhost/HTTPS is the current baseline.

## What runs where

    Browser microphone
      -> browser SpeechRecognition using the selected EN/SI/TA locale
      -> authenticated transcript request to Node.js
      -> configured LLM adapter
      -> Zod and business validation
      -> preview and explicit confirmation
      -> existing POST /api/expenses

The browser never receives an LLM API key. The draft endpoint never saves an expense.

## 1. Install and run locally

Node.js 22 or newer is required.

    cd backend
    npm install

Copy the values from `backend/.env.example` into the local `backend/.env` as appropriate for the existing database/JWT configuration. Then choose either the mock provider or one real provider below.

Start the backend:

    npm run dev

In another terminal:

    cd frontend
    npm install
    npm start

Sign in, open Dashboard, select English/Sinhala/Tamil in the existing language switcher, select the mic, and allow microphone access.

## 2. Development-only mock

This verifies the complete UI without an external LLM:

    NODE_ENV=development
    LLM_PROVIDER=mock
    VOICE_ALLOW_MOCK=true

Speak an amount that browser recognition renders as digits, such as “Lunch 2500 rupees today.” The mock is only a deterministic development aid; it does not provide real multilingual semantic extraction and is rejected in production.

## 3. Real configurable LLM

Choose one provider. The model ID is deliberately configuration rather than code because model availability and free tiers change.

### Gemini

    LLM_PROVIDER=gemini
    LLM_MODEL=<model-id-available-to-your-project>
    GEMINI_API_KEY=<server-side-key>

Create/select the key and model in Google AI Studio. Confirm the selected model supports structured output and is eligible for the quota/privacy tier you intend to use.

### Cohere

    LLM_PROVIDER=cohere
    LLM_MODEL=<command-model-id>
    COHERE_API_KEY=<server-side-key>

Evaluation keys are useful for testing but must not be treated as production capacity.

### DeepSeek

    LLM_PROVIDER=deepseek
    LLM_MODEL=<deepseek-model-id>
    DEEPSEEK_API_KEY=<server-side-key>

The default base URL is `https://api.deepseek.com`. Override `LLM_BASE_URL` only for an approved compatible endpoint.

### OpenAI

    LLM_PROVIDER=openai
    LLM_MODEL=<openai-model-id>
    OPENAI_API_KEY=<server-side-key>

Optional shared controls:

    LLM_TIMEOUT_MS=15000
    LLM_MAX_RETRIES=1

Restart/redeploy the backend after changing provider configuration. There is no silent fallback to a different provider.

## 4. Verification

    cd backend
    npm test

    cd ../frontend
    npm test -- --watchAll=false VoiceExpenseInput.test.jsx
    npm run build

The backend tests prove that the frontend form categories, backend category keys, system prompt, structured schema, and validation cannot silently drift.

## 5. Current limitations and required human validation

- Browser speech recognition support and remote processing depend on the browser vendor.
- Sinhala, Tamil, Sri Lankan English, numeric speech, and mixed-language phrases still require the documented 30-50 recording benchmark per language.
- There is no server-side audio/Whisper fallback in this first slice.
- Provider credentials and live provider responses are not covered by committed tests; use opt-in tests with a non-production key.
- Sinhala and Tamil UI wording should receive native-speaker review.
- Use HTTPS outside localhost because browsers restrict microphone features in insecure contexts.

Do not deploy the mock provider. Before production, select a real LLM provider, run the trilingual benchmark, review its retention/training terms, complete accessibility review, and decide whether browser STT quality is sufficient.
