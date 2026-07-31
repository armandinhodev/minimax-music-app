import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MusicPage from './page';

const authClientMocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  parseApiError: vi.fn(),
}));

const audioStorageMocks = vi.hoisted(() => ({
  storeAudioFromHex: vi.fn(),
}));

const historyMocks = vi.hoisted(() => ({
  saveHistoryItem: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => authClientMocks);
vi.mock('@/lib/audio-storage', () => audioStorageMocks);
vi.mock('@/lib/history', () => historyMocks);

vi.mock('@chakra-ui/react', () => ({
  Box: ({ children, as: Component = 'div', ...props }: { children?: ReactNode; as?: keyof JSX.IntrinsicElements } & Record<string, unknown>) => {
    void props;
    return <Component>{children}</Component>;
  },
}));

vi.mock('@/components/tts/AudioPlayer', () => ({
  AudioPlayer: ({ hex, format }: { hex: string; format?: string }) => <div>Audio preview {format}: {hex}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, colorPalette, size, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { colorPalette?: string; size?: string; variant?: string }) => {
    void colorPalette;
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

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, options, disabled }: { value?: string; onValueChange?: (value: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean }) => (
    <select value={value} disabled={disabled} onChange={(event) => onValueChange?.(event.currentTarget.value)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, disabled, onChange }: { checked?: boolean; disabled?: boolean; onChange?: (checked: boolean) => void }) => (
    <input
      aria-label="Instrumental mode"
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange?.(event.currentTarget.checked)}
    />
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ minH, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minH?: string }) => {
    void minH;
    return <textarea {...props} />;
  },
}));

vi.mock('@/components/shared/ErrorDisplay', () => ({
  ErrorDisplay: ({ message }: { message?: string | null }) => <div>{message}</div>,
}));

function changeTextarea(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('MusicPage', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    audioStorageMocks.storeAudioFromHex.mockResolvedValue('music-storage-key-1');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;
  });

  it('generates vocal music and saves only safe Library metadata', async () => {
    authClientMocks.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'trace-1',
        audio: '00010203',
        format: 'mp3',
        metadata: { traceId: 'trace-1', durationSeconds: 118, sampleRate: 44100, bitrate: 256000 },
      }),
    });

    act(() => {
      root!.render(<MusicPage />);
    });

    const prompt = container!.querySelector('#music-prompt') as HTMLTextAreaElement;
    const lyrics = container!.querySelector('#music-lyrics') as HTMLTextAreaElement;

    act(() => {
      changeTextarea(prompt, 'Glossy synth-pop with a bright chorus.');
      changeTextarea(lyrics, '[Verse]\nCity lights\n[Chorus]\nRise again');
    });

    const generateButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Generate Music');
    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(authClientMocks.authFetch).toHaveBeenCalledWith('/api/minimax/music', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'music-3.0',
        prompt: 'Glossy synth-pop with a bright chorus.',
        lyrics: '[Verse]\nCity lights\n[Chorus]\nRise again',
        instrumental: false,
        stream: false,
        outputFormat: 'hex',
        audioSetting: { sampleRate: 44100, bitrate: 256000, format: 'mp3' },
      }),
    }));
    expect(audioStorageMocks.storeAudioFromHex).toHaveBeenCalledWith('00010203', 'mp3');
    expect(historyMocks.saveHistoryItem).toHaveBeenCalledWith({
      type: 'music',
      source: 'text-to-music',
      text: 'Glossy synth-pop with a bright chorus.',
      lyrics: '[Verse]\nCity lights\n[Chorus]\nRise again',
      audioStorageKey: 'music-storage-key-1',
      format: 'mp3',
      model: 'music-3.0',
      instrumental: false,
      durationSeconds: 118,
      sampleRate: 44100,
      bitrate: 256000,
    });
    expect(JSON.stringify(historyMocks.saveHistoryItem.mock.calls[0][0])).not.toContain('00010203');
    expect(container!.textContent).toContain('Music generated, stored locally');
    expect(container!.textContent).toContain('Audio preview mp3: 00010203');
  });

  it('generates instrumental music without lyrics', async () => {
    authClientMocks.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'trace-2', audio: '00010203', format: 'mp3', metadata: {} }),
    });

    act(() => {
      root!.render(<MusicPage />);
    });

    const instrumentalToggle = container!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const prompt = container!.querySelector('#music-prompt') as HTMLTextAreaElement;

    act(() => {
      instrumentalToggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      changeTextarea(prompt, 'Instrumental cinematic piano with soft strings.');
    });

    const generateButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Generate Music');
    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(authClientMocks.authFetch).toHaveBeenCalledWith('/api/minimax/music', expect.objectContaining({
      body: expect.stringContaining('"instrumental":true'),
    }));
    expect(JSON.parse(authClientMocks.authFetch.mock.calls[0][1].body)).toMatchObject({
      prompt: 'Instrumental cinematic piano with soft strings.',
      lyrics: '',
      instrumental: true,
    });
    expect(historyMocks.saveHistoryItem).toHaveBeenCalledWith(expect.objectContaining({
      type: 'music',
      source: 'instrumental-music',
      lyrics: undefined,
      instrumental: true,
    }));
  });

  it('blocks vocal generation until lyrics are provided', async () => {
    act(() => {
      root!.render(<MusicPage />);
    });

    expect(container!.textContent).toContain('Add lyrics before generating vocal music.');
    const generateButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Generate Music') as HTMLButtonElement;

    await act(async () => {
      generateButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(generateButton.disabled).toBe(true);
    expect(authClientMocks.authFetch).not.toHaveBeenCalled();
  });

  it('keeps generated preview visible when local audio storage is unavailable', async () => {
    authClientMocks.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'trace-3', audio: '00010203', format: 'mp3', metadata: {} }),
    });
    audioStorageMocks.storeAudioFromHex.mockRejectedValue(new Error('IndexedDB unavailable'));

    act(() => {
      root!.render(<MusicPage />);
    });

    const lyrics = container!.querySelector('#music-lyrics') as HTMLTextAreaElement;
    act(() => {
      changeTextarea(lyrics, '[Chorus]\nRise again');
    });

    const generateButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Generate Music');
    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container!.textContent).toContain('Music generated for preview');
    expect(container!.textContent).toContain('Audio preview mp3: 00010203');
    expect(historyMocks.saveHistoryItem).not.toHaveBeenCalled();
  });
});
