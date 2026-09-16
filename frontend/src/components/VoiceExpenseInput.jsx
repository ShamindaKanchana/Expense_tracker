import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition as NativeSpeech } from '@capacitor-community/speech-recognition';
import api from '../services/api';
import { translateCategory } from '../utils/categories';
import './VoiceExpenseInput.css';

const MAX_RECORDING_SECONDS = 30;
const LOCALES = {
  en: 'en-LK',
  si: 'si-LK',
  ta: 'ta-LK'
};
// Native plugin language tags (device packs rarely include en-LK).
const NATIVE_LOCALES = {
  en: 'en-US',
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
  const stopFnRef = useRef(null);
  const nativeActiveRef = useRef(false);
  // Set after startWebRecording is defined (avoids init-order issues).
  const webRecorderRef = useRef(null);
  const lastPartialRef = useRef(0);
  const silenceIntervalRef = useRef(null);

  const clearRecordingTimers = useCallback(() => {
    window.clearInterval(intervalRef.current);
    window.clearTimeout(timeoutRef.current);
    window.clearInterval(silenceIntervalRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
    silenceIntervalRef.current = null;
  }, []);

  const reset = useCallback(() => {
    clearRecordingTimers();
    shouldProcessRef.current = false;
    stopFnRef.current = null;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    if (nativeActiveRef.current) {
      nativeActiveRef.current = false;
      NativeSpeech.removeAllListeners().catch(() => {});
      NativeSpeech.stop().catch(() => {});
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
    NativeSpeech.removeAllListeners().catch(() => {});
    if (nativeActiveRef.current) {
      nativeActiveRef.current = false;
      NativeSpeech.stop().catch(() => {});
    }
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

  const finishWithText = useCallback((spokenText) => {
    clearRecordingTimers();
    const text = String(spokenText || '').trim();
    if (!text) {
      setErrorMessage(t('voice.noSpeech'));
      setStage('error');
      return;
    }
    requestDraft(text);
  }, [clearRecordingTimers, requestDraft, t]);

  const beginTimers = useCallback((onTimeout) => {
    intervalRef.current = window.setInterval(() => {
      setSeconds((value) => Math.min(value + 1, MAX_RECORDING_SECONDS));
    }, 1000);
    timeoutRef.current = window.setTimeout(onTimeout, MAX_RECORDING_SECONDS * 1000);
  }, []);

  const startNativeRecording = useCallback(async (webFallback) => {
    try {
      const { available } = await NativeSpeech.available().catch(() => ({ available: false }));
      console.log('[voice] native available=' + available);
      if (!available) {
        if (webFallback && webRecorderRef.current) {
          webRecorderRef.current(webFallback);
          return;
        }
        setErrorMessage(t('voice.unsupported'));
        setStage('error');
        return;
      }
      // Best-effort permission check (Honor devices sometimes report stale
      // states — log raw values and let start() be the final arbiter).
      let permission = await NativeSpeech.checkPermissions().catch((e) => {
        console.log('[voice] checkPermissions failed', e);
        return null;
      });
      console.log('[voice] checkPermissions', JSON.stringify(permission));
      if (!permission || (permission.speechRecognition !== 'granted' && permission.speechRecognition !== 'limited')) {
        permission = await NativeSpeech.requestPermissions().catch((e) => {
          console.log('[voice] requestPermissions failed', e);
          return null;
        });
        console.log('[voice] requestPermissions', JSON.stringify(permission));
      }
      const state = permission?.speechRecognition;
      if (state !== 'granted' && state !== 'limited') {
        console.log('[voice] proceeding to start() despite state', state);
      }
    } catch {
      setErrorMessage(t('voice.recognitionFailed'));
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
    nativeActiveRef.current = true;

    await NativeSpeech.removeAllListeners().catch(() => {});
    await NativeSpeech.addListener('partialResults', (data) => {
      const text = (data?.matches?.[0] || '').trim();
      if (!text) return;
      transcriptRef.current = text;
      lastPartialRef.current = Date.now();
      setTranscript(text);
    }).catch(() => {});
    lastPartialRef.current = 0;
    // Mimic browser end-of-speech: 2.5s of silence after heard speech → auto-stop.
    silenceIntervalRef.current = window.setInterval(() => {
      if (!shouldProcessRef.current || !nativeActiveRef.current) return;
      if (!transcriptRef.current || !lastPartialRef.current) return;
      if (Date.now() - lastPartialRef.current > 2500) {
        console.log('[voice] silence auto-stop');
        window.clearInterval(silenceIntervalRef.current);
        silenceIntervalRef.current = null;
        const stop = stopFnRef.current;
        stopFnRef.current = null;
        setStage('processing');
        stop?.();
      }
    }, 500);

    stopFnRef.current = () => {
      if (!nativeActiveRef.current) return;
      nativeActiveRef.current = false;
      NativeSpeech.removeAllListeners().catch(() => {});
      // Some devices never settle stop() — race it so the UI can't hang.
      const stopAttempt = NativeSpeech.stop().catch((e) => {
        console.log('[voice] stop error', e?.message || e);
        return null;
      });
      const stopTimeout = new Promise((resolve) => {
        window.setTimeout(() => {
          console.log('[voice] stop timeout, falling back to last transcript');
          resolve(null);
        }, 4000);
      });
      Promise.race([stopAttempt, stopTimeout]).then((res) => {
        if (!shouldProcessRef.current) return;
        shouldProcessRef.current = false;
        const text = res?.matches?.[0] || transcriptRef.current;
        console.log('[voice] stop settled, text len=' + String(text || '').length);
        finishWithText(text);
      });
    };

    try {
      // popup:false keeps our own UI; result comes from stop().
      NativeSpeech.start({
        language: NATIVE_LOCALES[languageCode] || 'en-US',
        maxResults: 1,
        partialResults: true,
        popup: false
      }).catch((err) => {
        if (!shouldProcessRef.current) return;
        shouldProcessRef.current = false;
        nativeActiveRef.current = false;
        console.log('[voice] start failed', err?.message || err);
        const msg = String(err?.message || '');
        const key = /permission|denied|not-allowed|not_allowed/i.test(msg)
          ? 'voice.permissionDenied'
          : 'voice.recognitionFailed';
        setErrorMessage(t(key));
        setStage('error');
      });
      setStage('recording');
      beginTimers(() => stopFnRef.current?.());
    } catch {
      shouldProcessRef.current = false;
      nativeActiveRef.current = false;
      setErrorMessage(t('voice.recognitionFailed'));
      setStage('error');
    }
  }, [beginTimers, clearRecordingTimers, finishWithText, languageCode, t]);

  const startWebRecording = useCallback((Recognition) => {
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
      recognitionRef.current = null;
      if (!shouldProcessRef.current) return;
      shouldProcessRef.current = false;
      stopFnRef.current = null;
      finishWithText(transcriptRef.current);
    };

    stopFnRef.current = () => {
      recognitionRef.current?.stop();
    };

    try {
      recognition.start();
      setStage('recording');
      beginTimers(() => stopFnRef.current?.());
    } catch {
      shouldProcessRef.current = false;
      stopFnRef.current = null;
      setErrorMessage(t('voice.recognitionFailed'));
      setStage('error');
    }
  }, [beginTimers, clearRecordingTimers, finishWithText, locale, t]);

  const startRecording = useCallback(() => {
    const Recognition = getSpeechRecognition();
    const isNative = Capacitor.isNativePlatform();
    console.log('[voice] tap; native=' + isNative + ' webSR=' + (!!Recognition));
    if (isNative) {
      // On device prefer the native plugin: some WebViews expose a stub
      // webkitSpeechRecognition that fails with not-allowed.
      startNativeRecording(Recognition || null);
      return;
    }
    if (!Recognition) {
      setErrorMessage(t('voice.unsupported'));
      setStage('error');
      return;
    }
    startWebRecording(Recognition);
  }, [startNativeRecording, startWebRecording, t]);
  webRecorderRef.current = startWebRecording;

  const stopRecording = () => {
    setStage('processing');
    if (stopFnRef.current) {
      const stop = stopFnRef.current;
      stopFnRef.current = null;
      stop();
      return;
    }
    clearRecordingTimers();
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
