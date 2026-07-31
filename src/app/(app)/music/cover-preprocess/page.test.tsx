import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MusicCoverPreprocessPage from './page';

const authClientMocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  parseApiError: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => authClientMocks);

vi.mock('@chakra-ui/react', () => ({
  Box: ({ children, as: Component = 'div', ...props }: { children?: ReactNode; as?: keyof JSX.IntrinsicElements } & Record<string, unknown>) => {
    void props;
    return <Component>{children}</Component>;
  },
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

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
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

function changeInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function selectFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('MusicCoverPreprocessPage', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;
  const originalFileReader = globalThis.FileReader;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
    class MockFileReader {
      result: string | null = null;
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.result = 'data:audio/mpeg;base64,AAEC';
        this.onload?.(new ProgressEvent('load') as ProgressEvent<FileReader>);
      }
    }
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    globalThis.FileReader = originalFileReader;
    container?.remove();
    root = null;
    container = null;
  });

  it('preprocesses a reference audio URL', async () => {
    authClientMocks.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        coverFeatureId: 'cover-feature-1',
        formattedLyrics: '[Verse]\nCity lights',
        structureResult: '{"sections":["Verse"]}',
        audioDurationSeconds: 42,
        traceId: 'trace-cover-1',
        metadata: { status: 0, message: 'success' },
      }),
    });

    act(() => {
      root!.render(<MusicCoverPreprocessPage />);
    });

    const audioUrl = container!.querySelector('#cover-audio-url') as HTMLInputElement;
    act(() => {
      changeInput(audioUrl, 'https://example.com/reference.mp3');
    });

    const button = Array.from(container!.querySelectorAll('button')).find((element) => element.textContent === 'Preprocess Cover Audio');
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(authClientMocks.authFetch).toHaveBeenCalledWith('/api/minimax/music/cover-preprocess', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'music-cover',
        audioUrl: 'https://example.com/reference.mp3',
        audioBase64: '',
      }),
    }));
    expect(container!.textContent).toContain('cover-feature-1');
    expect(container!.textContent).toContain('valid for 24 hours');
  });

  it('converts a local audio upload to base64 without adding persistence calls', async () => {
    authClientMocks.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        coverFeatureId: 'cover-feature-base64',
        formattedLyrics: '',
        structureResult: '',
        audioDurationSeconds: 12,
        metadata: { status: 0 },
      }),
    });

    const setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem');

    act(() => {
      root!.render(<MusicCoverPreprocessPage />);
    });

    const audioFile = container!.querySelector('#cover-audio-file') as HTMLInputElement;
    await act(async () => {
      selectFile(audioFile, new File(['abc'], 'reference.mp3', { type: 'audio/mpeg' }));
    });

    const button = Array.from(container!.querySelectorAll('button')).find((element) => element.textContent === 'Preprocess Cover Audio');
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(JSON.parse(authClientMocks.authFetch.mock.calls[0][1].body)).toEqual({
      model: 'music-cover',
      audioUrl: '',
      audioBase64: 'AAEC',
    });
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('blocks submitting both URL and local upload sources', async () => {
    act(() => {
      root!.render(<MusicCoverPreprocessPage />);
    });

    const audioUrl = container!.querySelector('#cover-audio-url') as HTMLInputElement;
    const audioFile = container!.querySelector('#cover-audio-file') as HTMLInputElement;
    await act(async () => {
      changeInput(audioUrl, 'https://example.com/reference.mp3');
      selectFile(audioFile, new File(['abc'], 'reference.mp3', { type: 'audio/mpeg' }));
    });

    expect(container!.textContent).toContain('Use either a reference audio URL or a local upload, not both.');
    const button = Array.from(container!.querySelectorAll('button')).find((element) => element.textContent === 'Preprocess Cover Audio') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(authClientMocks.authFetch).not.toHaveBeenCalled();
  });
});
