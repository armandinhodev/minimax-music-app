import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CloneVoicePage from './page';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/voice/VoiceUpload', () => ({
  VoiceUpload: ({ onFileSelected, onUploadComplete }: { onFileSelected?: (file: File) => void; onUploadComplete?: (fileId: string, file: File) => void }) => (
    <button
      type="button"
      onClick={() => {
        const file = new File(['voice'], 'voice.wav', { type: 'audio/wav' });
        onFileSelected?.(file);
        onUploadComplete?.('file_uploaded_123', file);
      }}
    >
      Complete Upload
    </button>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/shared/ErrorDisplay', () => ({
  ErrorDisplay: ({ message }: { message?: string | null }) => <div>{message}</div>,
}));

vi.mock('@/components/shared/TTLCounter', () => ({
  TTLCounter: ({ label }: { label?: string }) => <span>{label}</span>,
}));

vi.mock('@chakra-ui/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@chakra-ui/react')>();
  return {
    ...actual,
    Box: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  };
});

describe('CloneVoicePage', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;
  });

  it('enables cloning after upload completion is reported by VoiceUpload', () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root!.render(<CloneVoicePage />);
    });

    const cloneButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Clone Voice');
    const uploadButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Complete Upload');

    expect(cloneButton).toBeDefined();
    expect(uploadButton).toBeDefined();
    expect(cloneButton?.hasAttribute('disabled')).toBe(true);

    act(() => {
      uploadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(cloneButton?.hasAttribute('disabled')).toBe(false);
  });
});
