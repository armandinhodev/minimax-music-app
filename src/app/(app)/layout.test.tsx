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
  default: ({ children, href, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; href: string }) => <a href={href} onClick={onClick} {...props}>{children}</a>,
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

describe('AppLayout navigation', () => {
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

  function renderLayout() {
    act(() => {
      root!.render(<AppLayout><main>Page content</main></AppLayout>);
    });
  }

  function getLinks() {
    return Array.from(container!.querySelectorAll('a')).map((link) => ({
      href: link.getAttribute('href'),
      text: link.textContent,
      current: link.getAttribute('aria-current'),
    }));
  }

  function getSectionToggle(sectionId: string) {
    return container!.querySelector(`button[aria-controls="product-nav-${sectionId}-items"]`) as HTMLButtonElement;
  }

  it('renders product areas while keeping inactive subitems closed by default', () => {
    navigationMocks.pathname = '/music/lyrics';
    renderLayout();

    const links = getLinks();

    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: '/music', text: expect.stringContaining('Music Generation') }),
      expect.objectContaining({ href: '/music/lyrics', text: expect.stringContaining('Lyrics Generation') }),
      expect.objectContaining({ href: '/music/cover-preprocess', text: expect.stringContaining('Cover Preprocess') }),
      expect.objectContaining({ href: '/library', text: expect.stringContaining('Library') }),
    ]));
    expect(links).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ href: '/voices', text: expect.stringContaining('Voices') }),
      expect.objectContaining({ href: '/image/image-to-image', text: expect.stringContaining('Image to Image') }),
    ]));
    expect(getSectionToggle('speech').getAttribute('aria-expanded')).toBe('false');
    expect(getSectionToggle('image').getAttribute('aria-expanded')).toBe('false');
    expect(getSectionToggle('music').getAttribute('aria-expanded')).toBe('true');
  });

  it('opens the active section by default', () => {
    navigationMocks.pathname = '/voices/clone';
    renderLayout();

    const links = getLinks();

    expect(getSectionToggle('speech').getAttribute('aria-expanded')).toBe('true');
    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: '/tts', text: expect.stringContaining('Text to Speech') }),
      expect.objectContaining({ href: '/voices/clone', text: expect.stringContaining('Clone Voice') }),
    ]));
    expect(links).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ href: '/image/image-to-image', text: expect.stringContaining('Image to Image') }),
      expect.objectContaining({ href: '/music/lyrics', text: expect.stringContaining('Lyrics Generation') }),
    ]));
  });

  it('expands an inactive section without changing the active page', () => {
    navigationMocks.pathname = '/music/lyrics';
    renderLayout();

    const speechToggle = getSectionToggle('speech');

    expect(speechToggle.getAttribute('aria-expanded')).toBe('false');

    act(() => {
      speechToggle.click();
    });

    expect(speechToggle.getAttribute('aria-expanded')).toBe('true');
    expect(getLinks()).toEqual(expect.arrayContaining([
      expect.objectContaining({ href: '/tts', text: expect.stringContaining('Text to Speech') }),
      expect.objectContaining({ href: '/voices/design', text: expect.stringContaining('Design Voice') }),
    ]));

    const currentLinks = getLinks().filter((link) => link.current === 'page');
    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0]).toEqual(expect.objectContaining({ href: '/music/lyrics' }));
  });

  it('keeps Voices inactive when a voice tool route is active', () => {
    navigationMocks.pathname = '/voices/clone';
    renderLayout();

    const currentLinks = getLinks().filter((link) => link.current === 'page');
    const speechSection = container!.querySelector('section[aria-label="Speech navigation"]');

    expect(speechSection?.getAttribute('data-active')).toBe('true');
    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0]).toEqual(expect.objectContaining({ href: '/voices/clone', text: expect.stringContaining('Clone Voice') }));
  });

  it('marks only the landing nav item current on product landing routes', () => {
    navigationMocks.pathname = '/tts';
    renderLayout();

    const currentLinks = getLinks().filter((link) => link.current === 'page');

    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0]).toEqual(expect.objectContaining({ href: '/tts', text: expect.stringContaining('Text to Speech') }));
  });

  it('does not mark the Image landing item active on Image to Image', () => {
    navigationMocks.pathname = '/image/image-to-image';
    renderLayout();

    const currentLinks = getLinks().filter((link) => link.current === 'page');
    const imageSection = container!.querySelector('section[aria-label="Image navigation"]');

    expect(imageSection?.getAttribute('data-active')).toBe('true');
    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0]).toEqual(expect.objectContaining({ href: '/image/image-to-image', text: expect.stringContaining('Image to Image') }));
  });

  it('opens and closes the mobile drawer accessibly', () => {
    navigationMocks.pathname = '/tts';
    renderLayout();

    const openButton = container!.querySelector('button[aria-label="Open navigation menu"]') as HTMLButtonElement;
    expect(openButton).not.toBeNull();
    expect(container!.querySelector('[role="dialog"]')).toBeNull();

    act(() => {
      openButton.click();
    });

    const dialog = container!.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBe('Main navigation');
    expect(container!.querySelector('button[aria-label="Close navigation menu"]')).not.toBeNull();
    expect(getLinks().filter((link) => link.current === 'page')).toHaveLength(1);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(container!.querySelector('[role="dialog"]')).toBeNull();
  });
});
