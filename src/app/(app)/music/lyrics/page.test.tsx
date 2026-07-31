import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LyricsGenerationPage from './page';

const authClientMocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  parseApiError: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => authClientMocks);

vi.mock('@chakra-ui/react', () => ({
  Box: ({ children, as: Component = 'div', asChild, ...props }: { children?: ReactNode; as?: keyof JSX.IntrinsicElements; asChild?: boolean } & Record<string, unknown>) => {
    void props;
    if (asChild && React.isValidElement(children)) return children;
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

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, options, disabled }: { value?: string; onValueChange?: (value: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean }) => (
    <select value={value} disabled={disabled} onChange={(event) => onValueChange?.(event.currentTarget.value)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
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

function changeInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function changeTextarea(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('LyricsGenerationPage', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks();
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

  it('generates lyrics and links them into Music Generation', async () => {
    authClientMocks.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        songTitle: 'Neon Afterglow',
        styleTags: ['synth-pop', 'uplifting'],
        lyrics: '[Verse]\nCity lights\n[Chorus]\nRise again',
        metadata: { status: 0, message: 'success' },
      }),
    });

    act(() => {
      root!.render(<LyricsGenerationPage />);
    });

    const title = container!.querySelector('#lyrics-title') as HTMLInputElement;
    const prompt = container!.querySelector('#lyrics-prompt') as HTMLTextAreaElement;
    act(() => {
      changeInput(title, 'Neon Afterglow');
      changeTextarea(prompt, 'Hopeful synth-pop.');
    });

    const generateButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Generate Lyrics');
    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(authClientMocks.authFetch).toHaveBeenCalledWith('/api/minimax/music/lyrics', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'write_full_song',
        prompt: 'Hopeful synth-pop.',
        lyrics: '',
        title: 'Neon Afterglow',
      }),
    }));
    expect(container!.textContent).toContain('[Chorus]');
    expect(container!.querySelector('a')?.getAttribute('href')).toContain('/music?lyrics=');
    expect(container!.querySelector('a')?.getAttribute('href')).toContain('prompt=Hopeful+synth-pop.');
  });

  it('blocks edit mode until source lyrics are provided', async () => {
    act(() => {
      root!.render(<LyricsGenerationPage />);
    });

    const mode = container!.querySelector('select') as HTMLSelectElement;
    act(() => {
      mode.value = 'edit';
      mode.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container!.textContent).toContain('Paste the lyrics you want MiniMax to edit.');
    const generateButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Generate Lyrics') as HTMLButtonElement;
    expect(generateButton.disabled).toBe(true);
    expect(authClientMocks.authFetch).not.toHaveBeenCalled();
  });
});
