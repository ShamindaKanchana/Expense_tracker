import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { translateCategory } from '../utils/categories';
import './VoiceExpenseInput.css';

const MAX_RECORDING_SECONDS = 30;
const LOCALES = {
  en: 'en-LK',
  si: 'si-LK',
  ta: 'ta-LK'
};

const MicIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

const getSpeechRecognition = () =>
  window.SpeechRecognition || window.webkitSpeechRecognition;

const getLanguageCode = (language) => {
  const code = String(language || 'en').split('-')[0];
  return Object.prototype.hasOwnProperty.call(LOCALES, code) ? code : 'en';
};

const formatAmount = (amount, locale) => {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount));
};

const formatDate = (date, locale) => {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${date}T00:00:00.000Z`));
};

const VoiceExpenseInput = ({ onSaved }) => {
  const { t, i18n } = useTranslation();
  const languageCode = getLanguageCode(i18n.resolvedLanguage || i18n.language);
  const locale = LOCALES[languageCode];

  const [stage, setStage] = useState('idle');
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const shouldProcessRef = useRef(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);

  const clearRecordingTimers = useCallback(() => {
    window.clearInterval(intervalRef.current);
    window.clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
  }, []);

  const reset = useCallback(() => {
    clearRecordingTimers();
    shouldProcessRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    transcriptRef.current = '';
    setTranscript('');
    setResult(null);
    setErrorMessage('');
    setSeconds(0);
    setStage('idle');
  }, [clearRecordingTimers]);

  useEffect(() => () => {
    clearRecordingTimers();
    window.clearTimeout(successTimeoutRef.current);
    shouldProcessRef.current = false;
    recognitionRef.current?.abort();
  }, [clearRecordingTimers]);

  useEffect(() => {
    if (stage !== 'idle') reset();
    // A language change intentionally closes any in-progress recording or draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    if (stage === 'idle' || stage === 'saving') return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') reset();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [reset, stage]);

  const requestDraft = useCallback(async (spokenText) => {
    setStage('processing');
    setErrorMessage('');

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Colombo';
      const response = await api.post('/voice-expenses/draft', {
        transcript: spokenText,
        locale,
        timezone
      });
      setResult(response.data);
      setStage('preview');
    } catch (error) {
      setErrorMessage(
        error.code
          ? t(`voice.errors.${error.code}`, { defaultValue: error.message })
          : error.message || t('voice.processingFailed')
      );
      setStage('error');
    }
  }, [locale, t]);

  const startRecording = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setErrorMessage(t('voice.unsupported'));
      setStage('error');
      return;
    }

    clearRecordingTimers();
    setErrorMessage('');
    setResult(null);
    setTranscript('');
    setSeconds(0);
    transcriptRef.current = '';
    shouldProcessRef.current = true;

    const recognition = new Recognition();
    recognition.lang = locale;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((entry) => entry[0]?.transcript || '')
        .join(' ')
        .trim();
      transcriptRef.current = text;
      setTranscript(text);
    };

    recognition.onerror = (event) => {
      clearRecordingTimers();
      if (!shouldProcessRef.current || event.error === 'aborted') return;
      shouldProcessRef.current = false;
      const key = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'voice.permissionDenied'
        : event.error === 'no-speech'
          ? 'voice.noSpeech'
          : 'voice.recognitionFailed';
      setErrorMessage(t(key));
      setStage('error');
    };

    recognition.onend = () => {
      clearRecordingTimers();
      recognitionRef.current = null;
      if (!shouldProcessRef.current) return;
      shouldProcessRef.current = false;
      const spokenText = transcriptRef.current.trim();
      if (!spokenText) {
        setErrorMessage(t('voice.noSpeech'));
        setStage('error');
        return;
      }
      requestDraft(spokenText);
    };

    try {
      recognition.start();
      setStage('recording');
      intervalRef.current = window.setInterval(() => {
        setSeconds((value) => Math.min(value + 1, MAX_RECORDING_SECONDS));
      }, 1000);
      timeoutRef.current = window.setTimeout(() => {
        recognition.stop();
      }, MAX_RECORDING_SECONDS * 1000);
    } catch {
      shouldProcessRef.current = false;
      setErrorMessage(t('voice.recognitionFailed'));
      setStage('error');
    }
  }, [clearRecordingTimers, locale, requestDraft, t]);

  const stopRecording = () => {
    clearRecordingTimers();
    setStage('processing');
    recognitionRef.current?.stop();
  };

  const discard = () => {
    reset();
  };

  const confirmSave = async () => {
    if (!result?.canProceed || !result?.draft) return;
    setStage('saving');
    setErrorMessage('');

    try {
      const response = await api.post('/expenses', result.draft);
      setStage('success');
      onSaved?.(response.data);
      successTimeoutRef.current = window.setTimeout(reset, 2200);
    } catch (error) {
      setErrorMessage(error.message || t('voice.saveFailed'));
      setStage('confirming');
    }
  };

  const draft = result?.draft;
  const statusLabel = (field) => {
    const status = result?.fieldStatus?.[field];
    return status ? t(`voice.status.${status}`) : null;
  };

  return (
    <>
      <button
        type="button"
        className="voice-entry-button"
        onClick={startRecording}
        aria-label={t('voice.addWithVoice')}
        title={t('voice.addWithVoice')}
        disabled={stage !== 'idle'}
      >
        <MicIcon />
      </button>

      {stage !== 'idle' && (
        <section className="voice-panel" aria-live="polite" aria-label={t('voice.title')}>
          <header className="voice-panel-header">
            <div>
              <h2>{t('voice.title')}</h2>
              <p>{t('voice.oneExpense')}</p>
            </div>
            <button type="button" className="voice-icon-button" onClick={discard} aria-label={t('common.close')}>
              <CloseIcon />
            </button>
          </header>

          {stage === 'recording' && (
            <div className="voice-recording">
              <div className="voice-recording-pulse"><MicIcon /></div>
              <strong>{t('voice.listening')}</strong>
              <span>{t('voice.languageName')}</span>
              <div className="voice-wave" aria-hidden="true">
                {[14, 24, 36, 20, 42, 28, 18, 34, 22, 14].map((height, index) => (
                  <i key={index} style={{ height }} />
                ))}
              </div>
              <time>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')} / 00:30</time>
              {transcript && <p className="voice-interim">{transcript}</p>}
              <p>{t('voice.speakHelp')}</p>
              <div className="voice-actions">
                <button type="button" className="voice-secondary" onClick={discard}>{t('common.cancel')}</button>
                <button type="button" onClick={stopRecording}>{t('voice.stop')}</button>
              </div>
            </div>
          )}

          {stage === 'processing' && (
            <div className="voice-processing">
              <span className="voice-spinner" aria-hidden="true" />
              <strong>{t('voice.processing')}</strong>
              <p>{t('voice.processingHelp')}</p>
            </div>
          )}

          {(stage === 'preview' || stage === 'confirming' || stage === 'saving') && draft && (
            <div className="voice-preview">
              <span className="voice-message-label">{t('voice.youSaid')}</span>
              <p className="voice-message">{result.transcript}</p>

              <div className="voice-draft-card">
                <h3>{t('voice.draft')}</h3>
                {[
                  ['description', draft.description],
                  ['amount', formatAmount(draft.amount, locale)],
                  ['category', draft.category ? translateCategory(t, draft.category) : null],
                  ['date', formatDate(draft.date, locale)]
                ].map(([field, value]) => (
                  <div className="voice-draft-field" key={field}>
                    <span>{t(`common.${field}`)}</span>
                    <strong className={!value ? 'voice-missing' : ''}>{value || t('voice.missing')}</strong>
                    {statusLabel(field) && <small>{statusLabel(field)}</small>}
                  </div>
                ))}
              </div>

              {result.warnings?.length > 0 && (
                <p className="voice-warning">
                  {result.canProceed ? t('voice.reviewWarning') : t('voice.incomplete')}
                </p>
              )}
              {errorMessage && <p className="voice-error">{errorMessage}</p>}

              <div className="voice-actions voice-preview-actions">
                <button type="button" className="voice-danger-text" onClick={discard}>{t('voice.discard')}</button>
                <button type="button" className="voice-secondary" onClick={startRecording}>{t('voice.retry')}</button>
                <button
                  type="button"
                  onClick={() => setStage('confirming')}
                  disabled={!result.canProceed || stage === 'saving'}
                >
                  {t('voice.proceed')}
                </button>
              </div>
            </div>
          )}

          {stage === 'error' && (
            <div className="voice-error-state">
              <strong>{t('voice.couldNotComplete')}</strong>
              <p>{errorMessage}</p>
              <div className="voice-actions">
                <button type="button" className="voice-secondary" onClick={discard}>{t('voice.discard')}</button>
                <button type="button" onClick={startRecording}>{t('voice.retry')}</button>
              </div>
            </div>
          )}

          {stage === 'success' && (
            <div className="voice-success" role="status">
              <span aria-hidden="true">✓</span>
              <strong>{t('voice.saved')}</strong>
            </div>
          )}
        </section>
      )}

      {(stage === 'confirming' || stage === 'saving') && draft && (
        <div className="voice-modal-backdrop" role="presentation">
          <div className="voice-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="voice-confirm-title">
            <h2 id="voice-confirm-title">{t('voice.confirmTitle')}</h2>
            <p>{t('voice.confirmCopy')}</p>
            <dl>
              <div><dt>{t('common.description')}</dt><dd>{draft.description}</dd></div>
              <div><dt>{t('common.amount')}</dt><dd>Rs {formatAmount(draft.amount, locale)}</dd></div>
              <div><dt>{t('common.category')}</dt><dd>{translateCategory(t, draft.category)}</dd></div>
              <div><dt>{t('common.date')}</dt><dd>{formatDate(draft.date, locale)}</dd></div>
            </dl>
            {errorMessage && <p className="voice-error">{errorMessage}</p>}
            <div className="voice-actions">
              <button
                type="button"
                className="voice-secondary"
                onClick={() => setStage('preview')}
                disabled={stage === 'saving'}
              >
                {t('voice.back')}
              </button>
              <button type="button" onClick={confirmSave} disabled={stage === 'saving'}>
                {stage === 'saving' ? t('voice.saving') : t('voice.confirmSave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceExpenseInput;
