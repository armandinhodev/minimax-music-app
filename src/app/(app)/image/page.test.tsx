import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImagePage from './page';

const authClientMocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  parseApiError: vi.fn(),
}));

const historyMocks = vi.hoisted(() => ({
  saveHistoryItem: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => authClientMocks);
vi.mock('@/lib/history', () => historyMocks);

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

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, disabled, onChange }: { checked?: boolean; disabled?: boolean; onChange?: (checked: boolean) => void }) => (
    <input
      aria-label="Prompt Optimizer"
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

function changeInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('ImagePage', () => {
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

  it('generates images and saves temporary URL metadata to Library history', async () => {
    authClientMocks.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'generation-1',
        imageUrls: ['https://example.com/image-1.png'],
        metadata: { successCount: 1, failedCount: 0 },
        expiresAt: 123456,
      }),
    });

    act(() => {
      root!.render(<ImagePage />);
    });

    const prompt = container!.querySelector('#image-prompt') as HTMLTextAreaElement;
    const count = container!.querySelector('#image-count') as HTMLInputElement;
    const seed = container!.querySelector('#image-seed') as HTMLInputElement;
    const optimizer = container!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    const ratioButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent?.includes('Widescreen'));
    const generateButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Generate Images');

    act(() => {
      changeTextarea(prompt, 'A premium studio product photo.');
      changeInput(count, '2');
      changeInput(seed, '42');
      optimizer.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      ratioButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(authClientMocks.authFetch).toHaveBeenCalledWith('/api/minimax/image', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'A premium studio product photo.',
        aspectRatio: '16:9',
        n: 2,
        seed: 42,
        promptOptimizer: true,
        responseFormat: 'url',
      }),
    }));
    expect(historyMocks.saveHistoryItem).toHaveBeenCalledWith({
      type: 'image',
      text: 'A premium studio product photo.',
      imageUrls: ['https://example.com/image-1.png'],
      source: 'text-to-image',
      aspectRatio: '16:9',
      seed: 42,
      model: 'image-01',
      promptOptimizer: true,
      ttlExpiry: 123456,
    });
    expect(container!.textContent).toContain('Images generated and saved to Library');
  });

  it('blocks empty prompts before calling the API', async () => {
    act(() => {
      root!.render(<ImagePage />);
    });

    const generateButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Generate Images');
    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(authClientMocks.authFetch).not.toHaveBeenCalled();
  });

  it('keeps generated previews visible when Library storage is unavailable', async () => {
    authClientMocks.authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'generation-2',
        imageUrls: ['https://example.com/image-2.png'],
        metadata: { successCount: 1, failedCount: 0 },
        expiresAt: 123456,
      }),
    });
    historyMocks.saveHistoryItem.mockImplementation(() => {
      throw new Error('Storage unavailable');
    });

    act(() => {
      root!.render(<ImagePage />);
    });

    const prompt = container!.querySelector('#image-prompt') as HTMLTextAreaElement;
    const generateButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Generate Images');

    act(() => {
      changeTextarea(prompt, 'A cinematic product banner.');
    });

    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container!.querySelector('img')?.getAttribute('src')).toBe('https://example.com/image-2.png');
    expect(container!.textContent).toContain('Images generated for preview');
    expect(container!.textContent).not.toContain('Failed to generate images');
  });
});
