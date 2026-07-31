import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LibraryPage from './page';

const audioStorageMocks = vi.hoisted(() => ({
  deleteStoredAudio: vi.fn(() => Promise.resolve()),
  downloadBlob: vi.fn(),
  getStoredAudio: vi.fn(),
}));

vi.mock('@/lib/audio-storage', () => audioStorageMocks);

vi.mock('@chakra-ui/react', () => ({
  Box: ({ children }: { children?: ReactNode } & Record<string, unknown>) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, colorPalette, loading, size, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { colorPalette?: string; loading?: boolean; size?: string; variant?: string }) => {
    void colorPalette;
    void loading;
    void size;
    void variant;
    return <button {...props}>{children}</button>;
  },
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/shared/ErrorDisplay', () => ({
  ErrorDisplay: ({ message }: { message?: string | null }) => <div>{message}</div>,
}));

vi.mock('@/components/shared/TTLCounter', () => ({
  TTLCounter: ({ label }: { label?: string }) => <span>{label}</span>,
}));

vi.mock('@/components/ui/confirmation-dialog', () => ({
  ConfirmationDialog: ({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel = 'Cancel',
    onConfirm,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div role="alertdialog" aria-label={title}>
        <p>{description}</p>
        <button type="button" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
}));

describe('LibraryPage destructive confirmations', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    localStorage.clear();
    seedHistory([{ id: 'history-1', type: 'tts', text: 'Hello world', voiceId: 'voice-a', createdAt: 1 }]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    localStorage.clear();
    root = null;
    container = null;
  });

  function seedHistory(items: unknown[]) {
    localStorage.setItem('minimax_speech_history', JSON.stringify(items));
  }

  it('removes one history item only after confirmation', () => {
    seedHistory([
      { id: 'history-1', type: 'tts', text: 'Hello world', voiceId: 'voice-a', audioStorageKey: 'audio-key-1', createdAt: 1 },
    ]);

    act(() => {
      root!.render(<LibraryPage />);
    });

    const removeButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Remove');
    expect(removeButton).toBeDefined();

    act(() => {
      removeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container!.querySelector('[role="alertdialog"]')?.getAttribute('aria-label')).toBe('Remove library item?');
    expect(localStorage.getItem('minimax_speech_history')).toContain('history-1');

    const confirmButton = Array.from(container!.querySelectorAll('[role="alertdialog"] button')).find((button) => button.textContent === 'Remove');
    act(() => {
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(localStorage.getItem('minimax_speech_history')).toBe('[]');
    expect(audioStorageMocks.deleteStoredAudio).toHaveBeenCalledWith('audio-key-1');
    expect(container!.textContent).toContain('No history yet.');
  });

  it('clears all history only after confirmation', () => {
    seedHistory([
      { id: 'history-1', type: 'tts', text: 'Hello world', voiceId: 'voice-a', audioStorageKey: 'audio-key-1', createdAt: 1 },
      { id: 'history-2', type: 'tts', text: 'Another item', voiceId: 'voice-a', audioStorageKey: 'audio-key-2', createdAt: 2 },
    ]);

    act(() => {
      root!.render(<LibraryPage />);
    });

    const clearButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Clear All');
    act(() => {
      clearButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container!.querySelector('[role="alertdialog"]')?.getAttribute('aria-label')).toBe('Clear all library history?');
    expect(localStorage.getItem('minimax_speech_history')).toContain('history-1');

    const cancelButton = Array.from(container!.querySelectorAll('[role="alertdialog"] button')).find((button) => button.textContent === 'Cancel');
    act(() => {
      cancelButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container!.querySelector('[role="alertdialog"]')).toBeNull();
    expect(localStorage.getItem('minimax_speech_history')).toContain('history-1');

    act(() => {
      clearButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const confirmButton = Array.from(container!.querySelectorAll('[role="alertdialog"] button')).find((button) => button.textContent === 'Clear All');
    act(() => {
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(localStorage.getItem('minimax_speech_history')).toBeNull();
    expect(audioStorageMocks.deleteStoredAudio).toHaveBeenCalledWith('audio-key-1');
    expect(audioStorageMocks.deleteStoredAudio).toHaveBeenCalledWith('audio-key-2');
    expect(container!.textContent).toContain('No history yet.');
  });

  it('opens direct audioUrl downloads for TTS items', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    seedHistory([
      {
        id: 'history-1',
        type: 'tts',
        text: 'Hello world',
        voiceId: 'voice-a',
        audioUrl: 'https://example.com/audio.mp3',
        format: 'mp3',
        createdAt: 1,
      },
    ]);

    act(() => {
      root!.render(<LibraryPage />);
    });

    const downloadButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Download');
    act(() => {
      downloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(openSpy).toHaveBeenCalledWith('https://example.com/audio.mp3', '_blank');
    expect(audioStorageMocks.getStoredAudio).not.toHaveBeenCalled();
  });

  it('downloads local audio blobs by audioStorageKey for TTS items', async () => {
    const blob = new Blob(['audio'], { type: 'audio/mpeg' });
    audioStorageMocks.getStoredAudio.mockResolvedValue({
      key: 'audio-key-1',
      blob,
      format: 'mp3',
      createdAt: 1,
    });
    seedHistory([
      {
        id: 'history-1',
        type: 'tts',
        text: 'Hello world',
        voiceId: 'voice-a',
        audioStorageKey: 'audio-key-1',
        format: 'mp3',
        createdAt: 123,
      },
    ]);

    act(() => {
      root!.render(<LibraryPage />);
    });

    const downloadButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Download');
    await act(async () => {
      downloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(audioStorageMocks.getStoredAudio).toHaveBeenCalledWith('audio-key-1');
    expect(audioStorageMocks.downloadBlob).toHaveBeenCalledWith(blob, 'tts-123.mp3');
  });

  it('filters items by type and shows storage status badges', () => {
    seedHistory([
      { id: 'history-1', type: 'tts', text: 'Hello world', voiceId: 'voice-a', audioStorageKey: 'audio-key-1', createdAt: 1 },
      { id: 'history-music', type: 'music', source: 'text-to-music', text: 'Glossy synth-pop', lyrics: '[Chorus]\nRise again', audioStorageKey: 'music-key-1', format: 'mp3', model: 'music-3.0', durationSeconds: 118, sampleRate: 44100, bitrate: 256000, createdAt: 5 },
      { id: 'history-2', type: 'image', source: 'image-to-image', text: 'A premium studio product photo', imageUrls: ['https://example.com/image.png'], aspectRatio: '1:1', createdAt: 2, ttlExpiry: Date.now() + 24 * 60 * 60 * 1000 },
      { id: 'history-3', type: 'clone', voiceId: 'voice-clone', createdAt: 3 },
      { id: 'history-4', type: 'design', voiceId: 'voice-design', createdAt: 4 },
    ]);

    act(() => {
      root!.render(<LibraryPage />);
    });

    expect(container!.textContent).toContain('Stored locally');
    expect(container!.textContent).toContain('Mode: Text to Music');
    expect(container!.textContent).toContain('Model: music-3.0');
    expect(container!.textContent).toContain('Duration: 118s');
    expect(container!.textContent).toContain('24h image URLs');
    expect(container!.textContent).toContain('Source: Image to Image');
    expect(container!.textContent).toContain('Voice only');

    const audioFilter = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Audio');
    act(() => {
      audioFilter?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container!.textContent).toContain('Hello world');
    expect(container!.textContent).not.toContain('Glossy synth-pop');
    expect(container!.textContent).not.toContain('premium studio');
    expect(container!.textContent).not.toContain('voice-clone');
    expect(container!.textContent).not.toContain('voice-design');
  });

  it('opens and downloads image URLs from Library cards', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const removeSpy = vi.spyOn(HTMLAnchorElement.prototype, 'remove').mockImplementation(() => undefined);
    seedHistory([
      {
        id: 'history-image',
        type: 'image',
        text: 'A premium studio product photo',
        imageUrls: ['https://example.com/image.png'],
        aspectRatio: '1:1',
        createdAt: 123,
        ttlExpiry: Date.now() + 24 * 60 * 60 * 1000,
      },
    ]);

    act(() => {
      root!.render(<LibraryPage />);
    });

    const openButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Open');
    act(() => {
      openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(openSpy).toHaveBeenCalledWith('https://example.com/image.png', '_blank');

    const downloadButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Download');
    act(() => {
      downloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('downloads local music blobs by audioStorageKey and music filename', async () => {
    const blob = new Blob(['music'], { type: 'audio/mpeg' });
    audioStorageMocks.getStoredAudio.mockResolvedValue({
      key: 'music-key-1',
      blob,
      format: 'mp3',
      createdAt: 1,
    });
    seedHistory([
      {
        id: 'history-music',
        type: 'music',
        source: 'text-to-music',
        text: 'Glossy synth-pop',
        audioStorageKey: 'music-key-1',
        format: 'mp3',
        createdAt: 456,
      },
    ]);

    act(() => {
      root!.render(<LibraryPage />);
    });

    const downloadButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Download');
    await act(async () => {
      downloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(audioStorageMocks.getStoredAudio).toHaveBeenCalledWith('music-key-1');
    expect(audioStorageMocks.downloadBlob).toHaveBeenCalledWith(blob, 'music-456.mp3');
  });

  it('marks TTS entries without a local blob or URL as missing audio', () => {
    seedHistory([
      { id: 'history-1', type: 'tts', text: 'Hello world', voiceId: 'voice-a', createdAt: 1 },
    ]);

    act(() => {
      root!.render(<LibraryPage />);
    });

    expect(container!.textContent).toContain('Audio unavailable');
    expect(container!.textContent).toContain('Missing audio');
    expect(container!.textContent).toContain('No local audio blob or temporary URL is available');
  });

  it('marks music entries without a local blob as missing audio', () => {
    seedHistory([
      { id: 'history-music', type: 'music', text: 'Glossy synth-pop', createdAt: 1 },
    ]);

    act(() => {
      root!.render(<LibraryPage />);
    });

    expect(container!.textContent).toContain('Music unavailable');
    expect(container!.textContent).toContain('Missing audio');
    expect(container!.textContent).toContain('No local audio blob or temporary URL is available');
  });
});
