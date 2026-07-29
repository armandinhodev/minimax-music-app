import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceGroupSection } from './VoiceGroupSection';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';

vi.mock('@/components/voice/VoiceCard', () => ({
  VoiceCard: ({ voice }: { voice: VoiceDTO }) => <div data-voice-card={voice.voiceId} />,
}));
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span data-count>{children}</span>,
}));
vi.mock('@chakra-ui/react', () => ({
  Box: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

describe('VoiceGroupSection', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;
  const voices: VoiceDTO[] = [
    { voiceId: 'English_A', name: 'A', type: 'system', language: 'English', createdAt: 1 },
    { voiceId: 'English_B', name: 'B', type: 'system', language: 'English', createdAt: 2 },
  ];

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('renders flag image, display name, count, and cards', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<VoiceGroupSection language="English" voices={voices} />));
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://flagcdn.com/40x30/gb.png');
    expect(img?.getAttribute('alt')).toBe('English');
    expect(img?.getAttribute('width')).toBe('40');
    expect(img?.getAttribute('height')).toBe('30');
    expect(img?.getAttribute('loading')).toBe('lazy');
    expect(container.textContent).toContain('English');
    expect(container.querySelector('[data-count]')?.textContent).toBe('2');
    expect(container.querySelectorAll('[data-voice-card]')).toHaveLength(2);
  });

  it('renders emoji fallback when language has no country code', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(
      <VoiceGroupSection
        language="Robot"
        voices={[{ voiceId: 'Robot_Armor', name: 'Armor', type: 'system', language: 'Robot', createdAt: 1 }]}
      />
    ));
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('🤖');
    expect(container.textContent).toContain('Robot / Synthetic');
  });

  it('renders an empty-state message when there are no voices', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<VoiceGroupSection language="English" voices={[]} />));
    expect(container.textContent).toContain('No voices in this group match the current filter.');
  });
});
