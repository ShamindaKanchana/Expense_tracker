const express = require('express');
const auth = require('../middleware/auth');
const voiceRateLimit = require('../middleware/voiceRateLimit');
const { voiceDraftRequestSchema } = require('../services/voice/schema');
const { extractExpenseDraft } = require('../services/voice/extractDraft');
const { VoiceServiceError } = require('../services/voice/errors');

const router = express.Router();

router.post('/draft', auth, voiceRateLimit, async (req, res) => {
  const parsed = voiceDraftRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Transcript, supported locale, and valid time zone are required.',
      code: 'VOICE_REQUEST_INVALID'
    });
  }

  try {
    const result = await extractExpenseDraft(parsed.data);
    return res.json(result);
  } catch (error) {
    if (error instanceof VoiceServiceError) {
      return res.status(error.status).json({
        message: error.message,
        code: error.code
      });
    }

    console.error('Unexpected voice extraction error:', error.message);
    return res.status(500).json({
      message: 'The voice expense could not be processed.',
      code: 'VOICE_SERVICE_ERROR'
    });
  }
});

module.exports = router;
