import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryGenerationDTO } from '@/application/dto/LibraryDTO';
import DashboardPage from './page';

const dashboardMocks = vi.hoisted(() => ({
  generations: [] as LibraryGenerationDTO[],
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('@chakra-ui/react', () => ({
  Box: ({ children, as: Component = 'div', ...props }: { children?: ReactNode; as?: keyof JSX.IntrinsicElements } & Record<string, unknown>) => {
    void props;
    return <Component>{children}</Component>;
  },
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/auth-client', () => ({
  authFetch: vi.fn(async () => ({
    ok: true,
    json: async () => ({ generations: dashboardMocks.generations }),
  })),
}));

describe('DashboardPage', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    dashboardMocks.generations = [];
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

  async function renderDashboard() {
    await act(async () => {
      root!.render(<DashboardPage />);
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders the empty operational dashboard state', async () => {
    await renderDashboard();

    expect(container!.textContent).toContain('Operational dashboard');
    expect(container!.textContent).toContain('No SQLite records yet');
    expect(Array.from(container!.querySelectorAll('a[href="/tts"]')).some((link) => link.textContent?.includes('Generate speech'))).toBe(true);
  });

  it('renders recent SQLite generations', async () => {
    dashboardMocks.generations = [
      {
        id: 'generation-1',
        kind: 'music',
        source: 'text-to-music',
        status: 'completed',
        title: null,
        prompt: 'Glossy synth-pop chorus',
        model: 'music-3.0',
        providerGenerationId: 'trace-1',
        providerTaskId: null,
        providerFileId: null,
        metadata: {},
        assets: [
          { id: 'asset-1', kind: 'audio', storageType: 'metadata_only', storageRef: null, format: 'mp3', mimeType: 'audio/mpeg', sizeBytes: null, expiresAt: null, metadata: {}, createdAt: 10 },
        ],
        createdAt: 10,
        updatedAt: 10,
      },
      {
        id: 'generation-2',
        kind: 'tts',
        source: 'text-to-speech',
        status: 'completed',
        title: 'Speech sample',
        prompt: 'Hello world',
        model: 'speech-2.6-hd',
        providerGenerationId: null,
        providerTaskId: null,
        providerFileId: null,
        metadata: {},
        assets: [
          { id: 'asset-2', kind: 'audio', storageType: 'metadata_only', storageRef: null, format: 'mp3', mimeType: 'audio/mpeg', sizeBytes: null, expiresAt: null, metadata: {}, createdAt: 11 },
          { id: 'asset-3', kind: 'metadata', storageType: 'metadata_only', storageRef: null, format: null, mimeType: null, sizeBytes: null, expiresAt: null, metadata: {}, createdAt: 11 },
        ],
        createdAt: 11,
        updatedAt: 11,
      },
    ];

    await renderDashboard();

    expect(container!.textContent).toContain('2');
    expect(container!.textContent).toContain('Glossy synth-pop chorus');
    expect(container!.querySelector('a[href="/music"]')?.textContent).toContain('Music');
  });
});
