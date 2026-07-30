import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';
import VoicesPage from './page';

const authFetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth-client', () => ({
  authFetch: authFetchMock,
  parseApiError: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

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

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/shared/ErrorDisplay', () => ({
  ErrorDisplay: ({ message }: { message?: string | null }) => <div>{message}</div>,
}));

vi.mock('@/components/voice/VoiceGroupSection', () => ({
  VoiceGroupSection: ({ voices }: { voices: VoiceDTO[] }) => <div data-system-count={voices.length} />,
}));

vi.mock('@/components/voice/VoiceCard', () => ({
  VoiceCard: ({ voice, onDelete, isDeleting }: { voice: VoiceDTO; onDelete?: (voice: VoiceDTO) => void; isDeleting?: boolean }) => (
    <article>
      <span>{voice.voiceId}</span>
      {onDelete && (
        <button type="button" onClick={() => onDelete(voice)}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      )}
    </article>
  ),
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

describe('VoicesPage destructive confirmations', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    authFetchMock.mockReset();
    authFetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          voices: [
            { voiceId: 'user-voice-1', name: 'User Voice', type: 'clone', language: 'English', createdAt: 1 },
          ],
        }),
        { status: 200 }
      )
    );
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

  it('deletes a user voice only after confirmation', async () => {
    await act(async () => {
      root!.render(<VoicesPage />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const deleteButton = Array.from(container!.querySelectorAll('button')).find((button) => button.textContent === 'Delete');
    expect(deleteButton).toBeDefined();

    act(() => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container!.querySelector('[role="alertdialog"]')?.getAttribute('aria-label')).toBe('Delete voice?');
    expect(authFetchMock).toHaveBeenCalledTimes(1);

    const cancelButton = Array.from(container!.querySelectorAll('[role="alertdialog"] button')).find((button) => button.textContent === 'Cancel');
    act(() => {
      cancelButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container!.querySelector('[role="alertdialog"]')).toBeNull();
    expect(authFetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    authFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const confirmButton = Array.from(container!.querySelectorAll('[role="alertdialog"] button')).find((button) => button.textContent === 'Delete');
    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(authFetchMock).toHaveBeenCalledTimes(2);
    expect(authFetchMock).toHaveBeenLastCalledWith('/api/minimax/voices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceId: 'user-voice-1', voiceType: 'voice_cloning' }),
    });
    expect(container!.textContent).not.toContain('user-voice-1');
  });
});
