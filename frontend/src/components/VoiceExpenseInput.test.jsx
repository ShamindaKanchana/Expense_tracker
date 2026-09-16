import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VoiceExpenseInput from './VoiceExpenseInput';
import api from '../services/api';

jest.mock('../services/api', () => ({
  post: jest.fn()
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: 'en',
      resolvedLanguage: 'en'
    }
  })
}));

class SpeechRecognitionMock {
  static instance;

  constructor() {
    SpeechRecognitionMock.instance = this;
  }

  start = jest.fn();
  stop = jest.fn();
  abort = jest.fn();
}

describe('VoiceExpenseInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.SpeechRecognition = SpeechRecognitionMock;
  });

  afterEach(() => {
    delete window.SpeechRecognition;
  });

  test('recognizes, previews, confirms, and saves an expense', async () => {
    const onSaved = jest.fn();
    api.post
      .mockResolvedValueOnce({
        data: {
          transcript: 'Lunch 2500',
          draft: {
            amount: 2500,
            description: 'Lunch',
            category: 'Food',
            date: '2026-09-14'
          },
          fieldStatus: {
            amount: 'explicit',
            description: 'explicit',
            category: 'inferred',
            date: 'defaulted'
          },
          warnings: ['CATEGORY_INFERRED', 'DATE_DEFAULTED'],
          canProceed: true
        }
      })
      .mockResolvedValueOnce({ data: { id: 42 } });

    render(<VoiceExpenseInput onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: 'voice.addWithVoice' }));

    await act(async () => {
      SpeechRecognitionMock.instance.onresult({
        results: [[{ transcript: 'Lunch 2500' }]]
      });
      SpeechRecognitionMock.instance.onend();
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/voice-expenses/draft', expect.objectContaining({
        transcript: 'Lunch 2500',
        locale: 'en-LK'
      }));
    });
    expect(await screen.findByText('Lunch')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'voice.proceed' }));
    expect(screen.getByRole('dialog', { name: 'voice.confirmTitle' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'voice.confirmSave' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenLastCalledWith('/expenses', {
        amount: 2500,
        description: 'Lunch',
        category: 'Food',
        date: '2026-09-14'
      });
      expect(onSaved).toHaveBeenCalledWith({ id: 42 });
    });
  });

  test('shows a recoverable error when browser recognition is unavailable', () => {
    delete window.SpeechRecognition;
    render(<VoiceExpenseInput />);

    fireEvent.click(screen.getByRole('button', { name: 'voice.addWithVoice' }));

    expect(screen.getByText('voice.unsupported')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'voice.retry' })).toBeInTheDocument();
  });
});
