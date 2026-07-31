import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppLayout from './layout';

const navigationMocks = vi.hoisted(() => ({
  pathname: '/music/lyrics',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMocks.pathname,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, onClick }: { children: ReactNode; href: string; onClick?: () => void }) => <a href={href} onClick={onClick}>{children}</a>,
}));

vi.mock('@chakra-ui/react', () => ({
  Box: ({ children, as: Component = 'div', asChild, ...props }: { children?: ReactNode; as?: keyof JSX.IntrinsicElements; asChild?: boolean } & Record<string, unknown>) => {
    void props;
    if (asChild && React.isValidElement(children)) return children;
    return <Component>{children}</Component>;
  },
}));

vi.mock('@/components/shared/AppKeyGate', () => ({
  AppKeyGate: ({ children }: { children: ReactNode }) => <>{children}</>,
  clearAppAccessKey: vi.fn(),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => {
    void variant;
    void size;
    return <button {...props}>{children}</button>;
  },
}));

describe('AppLayout music navigation', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
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

  it('renders Music as a nested section with all Music API items', () => {
    act(() => {
      root!.render(<AppLayout><main>Page content</main></AppLayout>);
    });

    const links = Array.from(container!.querySelectorAll('a')).map((link) => ({
      href: link.getAttribute('href'),
      text: link.textContent,
    }));

    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: '/music', text: expect.stringContaining('Music Generation') }),
      expect.objectContaining({ href: '/music/lyrics', text: expect.stringContaining('Lyrics Generation') }),
      expect.objectContaining({ href: '/music/cover-preprocess', text: expect.stringContaining('Cover Preprocess') }),
    ]));
  });
});
