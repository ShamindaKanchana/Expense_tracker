class VoiceServiceError extends Error {
  constructor(message, { code = 'VOICE_SERVICE_ERROR', status = 500, cause } = {}) {
    super(message, { cause });
    this.name = 'VoiceServiceError';
    this.code = code;
    this.status = status;
  }
}

module.exports = { VoiceServiceError };
