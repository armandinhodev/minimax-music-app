import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceSelector } from './VoiceSelector';

const { authFetchMock } = vi.hoisted(() => ({
  authFetchMock: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authFetch: authFetchMock,
  parseApiError: vi.fn(async () => ({ message: 'Failed' })),
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

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    disabled,
    id,
    onValueChange,
    options,
    placeholder,
    value,
  }: {
    disabled?: boolean;
    id?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    value?: string;
  }) => (
    <div
      data-select
      data-disabled={disabled ? 'true' : 'false'}
      data-placeholder={placeholder}
      data-value={value}
      id={id}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-option-value={option.value}
          onClick={() => onValueChange?.(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}));

const STORAGE_KEY = 'minimax_speech_history';
const USER_VOICE_TTL_MS = 168 * 60 * 60 * 1000;

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('VoiceSelector', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    authFetchMock.mockReset();
    localStorage.clear();
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

  it('adds a freshly cloned voice from local history before get_voice returns it', async () => {
    const createdAt = Date.now() - 60_000;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'history-clone-1',
          type: 'clone',
          voiceId: 'fresh_clone_voice',
          fileId: 'file_123',
          createdAt,
        },
      ]),
    );
    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        voices: [
          {
            voiceId: 'English_system_voice',
            name: 'English System Voice',
            language: 'English',
            type: 'system',
            createdAt: 1,
          },
        ],
      }),
    });

    let selectedVoiceId = '';
    await act(async () => {
      root!.render(<VoiceSelector value="" onChange={(voiceId) => { selectedVoiceId = voiceId; }} />);
    });
    await flushEffects();

    const clonedVoiceOption = container!.querySelector('[data-option-value="fresh_clone_voice"]') as HTMLButtonElement | null;
    expect(clonedVoiceOption).not.toBeNull();
    expect(clonedVoiceOption?.textContent).toContain('fresh_clone_voice (fresh_clone_voice)');
    expect(clonedVoiceOption?.textContent).toContain('Cloned voice');
    expect(clonedVoiceOption?.textContent).toContain('expires');

    act(() => {
      clonedVoiceOption?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(selectedVoiceId).toBe('fresh_clone_voice');
  });

  it('does not add expired cloned voices from local history', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'history-clone-1',
          type: 'clone',
          voiceId: 'expired_clone_voice',
          fileId: 'file_123',
          createdAt: Date.now() - USER_VOICE_TTL_MS - 1,
        },
      ]),
    );
    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ voices: [] }),
    });

    await act(async () => {
      root!.render(<VoiceSelector value="" onChange={() => undefined} />);
    });
    await flushEffects();

    expect(container!.querySelector('[data-option-value="expired_clone_voice"]')).toBeNull();
  });

  it('uses isolated select ids when multiple voice selectors render on the same page', async () => {
    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ voices: [] }),
    });

    await act(async () => {
      root!.render(
        <>
          <VoiceSelector value="" onChange={() => undefined} label="Voice" />
          <VoiceSelector value="" onChange={() => undefined} label="Streaming Voice" />
        </>,
      );
    });
    await flushEffects();

    const selects = Array.from(container!.querySelectorAll('[data-select]'));
    const labels = Array.from(container!.querySelectorAll('label'));
    expect(selects).toHaveLength(2);
    expect(labels).toHaveLength(2);

    const selectIds = selects.map((select) => select.id);
    const labelTargets = labels.map((label) => label.htmlFor);

    expect(selectIds.every(Boolean)).toBe(true);
    expect(new Set(selectIds).size).toBe(2);
    expect(labelTargets).toEqual(selectIds);
  });
});
