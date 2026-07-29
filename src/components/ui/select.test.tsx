import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Select } from './select';
import type { SelectOption } from './select';

vi.mock('@chakra-ui/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@chakra-ui/react')>();
  let capturedOnValueChange: ((details: { value: string[] }) => void) | undefined;
  const passthrough = ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
    <div {...props}>{children}</div>
  );
  return {
    ...actual,
    Box: passthrough,
    Portal: passthrough,
    createListCollection: <T,>(config: { items: T[] }) => ({ items: config.items }),
    Select: {
      Root: ({
        children,
        onValueChange,
        value,
      }: {
        children?: ReactNode;
        onValueChange?: (details: { value: string[] }) => void;
        value?: string[];
      }) => {
        capturedOnValueChange = onValueChange;
        return (
          <div data-select-root data-selected={value && value.length > 0 ? value[0] : ''}>
            {children}
          </div>
        );
      },
      HiddenSelect: () => <input type="hidden" data-hidden-select />,
      Control: passthrough,
      Trigger: ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) => (
        <button type="button" data-select-trigger {...props}>
          {children}
        </button>
      ),
      ValueText: ({
        children,
        placeholder,
      }: {
        children?: ReactNode;
        placeholder?: string;
      }) => (
        <span data-select-value>{children ?? placeholder ?? ''}</span>
      ),
      IndicatorGroup: passthrough,
      Indicator: () => <span data-select-indicator />,
      Positioner: passthrough,
      Content: ({ children }: { children?: ReactNode }) => <div data-select-content>{children}</div>,
      ItemGroup: ({ children, id }: { children?: ReactNode; id?: string }) => (
        <div data-item-group data-group-id={id}>
          {children}
        </div>
      ),
      ItemGroupLabel: ({ children }: { children?: ReactNode }) => (
        <div data-item-group-label>{children}</div>
      ),
      Item: ({
        children,
        item,
      }: {
        children?: ReactNode;
        item: SelectOption;
      }) => (
        <div
          data-select-item={item.value}
          onClick={() => capturedOnValueChange?.({ value: [item.value] })}
        >
          {children}
        </div>
      ),
      ItemText: ({ children }: { children?: ReactNode }) => <span data-item-text>{children}</span>,
      ItemIndicator: () => <span data-item-indicator />,
    },
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

  it('renders one item per option plus a trigger (no flags, no grouping)', () => {
    act(() => {
      root!.render(
        <Select
          placeholder="Choose..."
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ]}
        />,
      );
    });

    const itemA = container!.querySelector('[data-select-item="a"]');
    const itemB = container!.querySelector('[data-select-item="b"]');
    expect(itemA).not.toBeNull();
    expect(itemB).not.toBeNull();
    expect(itemA!.querySelector('[data-item-text]')?.textContent).toBe('A');
    expect(itemB!.querySelector('[data-item-text]')?.textContent).toBe('B');
    expect(container!.querySelector('[data-select-trigger]')).not.toBeNull();
    expect(container!.querySelector('[data-select-value]')?.textContent).toBe('Choose...');
  });

  it('renders a flag <img> inside each item when flag is provided', () => {
    act(() => {
      root!.render(
        <Select
          value="English_A"
          options={[
            {
              value: 'English_A',
              label: 'English A',
              flag: { countryCode: 'gb', displayName: 'English', fallbackEmoji: '🌐' },
            },
          ]}
        />,
      );
    });

    const item = container!.querySelector('[data-select-item="English_A"]');
    const img = item?.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://flagcdn.com/20x15/gb.png');
    expect(img?.getAttribute('alt')).toBe('English');
    expect(img?.getAttribute('width')).toBe('20');
    expect(img?.getAttribute('height')).toBe('15');
  });

  it('renders an emoji fallback for items whose flag has no countryCode', () => {
    act(() => {
      root!.render(
        <Select
          options={[
            {
              value: 'Robot_Armor',
              label: 'Robot Armor',
              flag: { displayName: 'Robot / Synthetic', fallbackEmoji: '🤖' },
            },
          ]}
        />,
      );
    });

    const item = container!.querySelector('[data-select-item="Robot_Armor"]');
    expect(item?.querySelector('img')).toBeNull();
    expect(item?.textContent).toContain('🤖');
  });

  it('groups items under ItemGroup + ItemGroupLabel when groupBy is set', () => {
    const groupedOptions = [
      { value: 'English_A', label: 'English A', flag: { countryCode: 'gb', displayName: 'English', fallbackEmoji: '🌐' } },
      { value: 'English_B', label: 'English B', flag: { countryCode: 'gb', displayName: 'English', fallbackEmoji: '🌐' } },
      { value: 'Korean_A', label: 'Korean A', flag: { countryCode: 'kr', displayName: 'Korean', fallbackEmoji: '🌐' } },
      { value: 'Spanish_A', label: 'Spanish A', flag: { countryCode: 'es', displayName: 'Spanish', fallbackEmoji: '🌐' } },
    ];

    act(() => {
      root!.render(
        <Select
          options={groupedOptions}
          groupBy={(o) => o.flag?.displayName}
        />,
      );
    });

    const groups = Array.from(container!.querySelectorAll('[data-item-group]'));
    expect(groups).toHaveLength(3);

    const labels = Array.from(container!.querySelectorAll('[data-item-group-label]')).map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(
      expect.arrayContaining(['English', 'Korean', 'Spanish']),
    );
  });

  it('calls onValueChange with the picked item value', () => {
    let received = '';
    act(() => {
      root!.render(
        <Select
          value="a"
          onValueChange={(v) => {
            received = v;
          }}
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ]}
        />,
      );
    });

    const itemB = container!.querySelector('[data-select-item="b"]') as HTMLElement;
    act(() => {
      itemB.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(received).toBe('b');
  });

  it('renders the placeholder when value is empty', () => {
    act(() => {
      root!.render(
        <Select
          placeholder="Pick one..."
          value=""
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ]}
        />,
      );
    });

    const valueEl = container!.querySelector('[data-select-value]');
    expect(valueEl?.textContent).toBe('Pick one...');
  });
});
