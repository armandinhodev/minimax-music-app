import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Select } from './select';

vi.mock('@chakra-ui/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@chakra-ui/react')>();
  return {
    ...actual,
    Box: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  };
});

describe('Select', () => {
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

  it('renders one <option> per item plus a disabled placeholder option', () => {
    act(() => {
      root!.render(
        <Select
          placeholder="Choose..."
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ]}
        />
      );
    });

    const nativeSelect = container!.querySelector('select');
    expect(nativeSelect).not.toBeNull();

    const options = Array.from(nativeSelect!.querySelectorAll('option')) as HTMLOptionElement[];
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toBe('Choose...');
    expect(options[0].disabled).toBe(true);
    expect(options[1].textContent).toBe('A');
    expect(options[1].value).toBe('a');
    expect(options[2].textContent).toBe('B');
    expect(options[2].value).toBe('b');
  });

  it('does not place any non-option element directly inside the native <select>', () => {
    act(() => {
      root!.render(
        <Select
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ]}
        />
      );
    });

    const nativeSelect = container!.querySelector('select');
    expect(nativeSelect).not.toBeNull();

    // Every direct child must be an <option>. This catches the regression
    // where the old compound pieces (SelectTrigger / SelectContent) wrapped
    // children in <Box>, which produced invalid <div> elements inside
    // <select> and triggered the React hydration error:
    //   "In HTML, <div> cannot be a child of <select>."
    const directChildren = Array.from(nativeSelect!.children);
    expect(directChildren.length).toBeGreaterThan(0);
    directChildren.forEach((child) => {
      expect(child.tagName).toBe('OPTION');
    });
  });

  it('calls onValueChange with the selected value when the user changes selection', () => {
    let received = '';
    act(() => {
      root!.render(
        <Select
          value=""
          onValueChange={(v) => {
            received = v;
          }}
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ]}
        />
      );
    });

    const nativeSelect = container!.querySelector('select') as HTMLSelectElement;
    nativeSelect.value = 'b';
    act(() => {
      nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(received).toBe('b');
  });
});