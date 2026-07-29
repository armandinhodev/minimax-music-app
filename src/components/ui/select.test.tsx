import React, { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Select } from './select';
import type { SelectOption } from './select';

vi.mock('@chakra-ui/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@chakra-ui/react')>();
  const ReactModule = await import('react');
  let capturedOnValueChange: ((details: { value: string[] }) => void) | undefined;
  const passthrough = ({ children }: { children?: ReactNode } & Record<string, unknown>) => (
    <div>{children}</div>
  );
  const contains = (haystack: string, needle: string) =>
    haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());

  interface MockCollection {
    items: SelectOption[];
    getItemValue: (item: SelectOption) => string;
    toString: () => string;
  }

  interface MockComboboxContextValue {
    collection: MockCollection;
    inputValue?: string;
    onInputValueChange?: (details: { inputValue: string }) => void;
    onOpenChange?: (details: { open: boolean; value: string[] }) => void;
    onValueChange?: (details: { value: string[] }) => void;
    value?: string[];
  }

  const MockComboboxContext = ReactModule.createContext<MockComboboxContextValue | null>(null);

  return {
    ...actual,
    Box: passthrough,
    Portal: passthrough,
    createListCollection: <T,>(config: { items: T[] }) => ({ items: config.items }),
    useFilter: () => ({ contains }),
    useListCollection: ({
      initialItems,
      filter,
      itemToString,
      itemToValue,
    }: {
      initialItems: SelectOption[];
      filter?: (itemText: string, filterText: string, item: SelectOption) => boolean;
      itemToString: (item: SelectOption) => string;
      itemToValue: (item: SelectOption) => string;
    }) => {
      const [items, setItems] = ReactModule.useState<SelectOption[]>([...initialItems]);
      const [filterText, setFilterText] = ReactModule.useState('');
      const filteredItems = ReactModule.useMemo(
        () =>
          filterText && filter
            ? items.filter((item) => filter(itemToString(item), filterText, item))
            : items,
        [filter, filterText, itemToString, items],
      );
      const set = ReactModule.useCallback((nextItems: SelectOption[]) => {
        setItems(nextItems);
        setFilterText('');
      }, []);
      const reset = ReactModule.useCallback(() => {
        setItems([...initialItems]);
        setFilterText('');
      }, [initialItems]);
      const applyFilter = ReactModule.useCallback((text: string) => {
        setFilterText(text);
      }, []);
      const collection = ReactModule.useMemo<MockCollection>(
        () => ({
          items: filteredItems,
          getItemValue: itemToValue,
          toString: () => 'mocked-collection',
        }),
        [filteredItems, itemToValue],
      );

      return { collection, filter: applyFilter, reset, set };
    },
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
    Combobox: {
      Root: ({
        children,
        collection,
        inputValue,
        onInputValueChange,
        onOpenChange,
        onValueChange,
        value,
      }: MockComboboxContextValue & { children?: ReactNode }) => (
        <MockComboboxContext.Provider
          value={{
            collection,
            inputValue,
            onInputValueChange,
            onOpenChange,
            onValueChange,
            value,
          }}
        >
          <div
            data-combobox-root
            data-selected={value && value.length > 0 ? value[0] : ''}
          >
            {children}
          </div>
        </MockComboboxContext.Provider>
      ),
      Control: passthrough,
      Input: ({ placeholder }: { placeholder?: string }) => {
        const context = ReactModule.useContext(MockComboboxContext);
        return (
          <input
            data-combobox-input
            placeholder={placeholder ?? ''}
            value={context?.inputValue ?? ''}
            onChange={(event) =>
              context?.onInputValueChange?.({ inputValue: event.target.value })
            }
          />
        );
      },
      IndicatorGroup: passthrough,
      Trigger: () => {
        const context = ReactModule.useContext(MockComboboxContext);
        return (
          <button
            type="button"
            data-combobox-trigger
            onClick={() =>
              context?.onOpenChange?.({ open: false, value: context.value ?? [] })
            }
          />
        );
      },
      Positioner: passthrough,
      Content: ({ children }: { children?: ReactNode }) => <div data-combobox-content>{children}</div>,
      ItemGroup: ({ children, id }: { children?: ReactNode; id?: string }) => (
        <div data-combobox-item-group data-group-id={id}>
          {children}
        </div>
      ),
      ItemGroupLabel: ({ children }: { children?: ReactNode }) => (
        <div data-combobox-item-group-label>{children}</div>
      ),
      Item: ({ children, item }: { children?: ReactNode; item: SelectOption }) => {
        const context = ReactModule.useContext(MockComboboxContext);
        return (
          <div
            data-combobox-item={item.value}
            onClick={() => context?.onValueChange?.({ value: [item.value] })}
          >
            {children}
          </div>
        );
      },
      ItemText: ({ children }: { children?: ReactNode }) => (
        <span data-combobox-item-text>{children}</span>
      ),
      ItemIndicator: () => <span data-combobox-item-indicator />,
      Empty: ({ children }: { children?: ReactNode }) => {
        const context = ReactModule.useContext(MockComboboxContext);
        return context?.collection.items.length === 0 ? (
          <div data-combobox-empty>{children}</div>
        ) : null;
      },
    },
  };
});

function enterText(input: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

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

  it('renders an integrated search input when searchable is true', () => {
    act(() => {
      root!.render(
        <Select
          searchable
          placeholder="Search voices..."
          options={[{ value: 'voice-a', label: 'Voice A' }]}
        />,
      );
    });

    const input = container!.querySelector('[data-combobox-input]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('placeholder')).toBe('Search voices...');
    expect(container!.querySelector('[data-select-root]')).toBeNull();
  });

  it('renders flag images inside searchable items', () => {
    act(() => {
      root!.render(
        <Select
          searchable
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

    const item = container!.querySelector('[data-combobox-item="English_A"]');
    const img = item?.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://flagcdn.com/20x15/gb.png');
  });

  it('filters searchable items by language display name', () => {
    const options: SelectOption[] = [
      {
        value: 'voice-a',
        label: 'Voice A',
        flag: { countryCode: 'gb', displayName: 'English', fallbackEmoji: '🌐' },
      },
      {
        value: 'voice-b',
        label: 'Voice B',
        flag: { countryCode: 'kr', displayName: 'Korean', fallbackEmoji: '🌐' },
      },
    ];

    act(() => {
      root!.render(
        <Select
          searchable
          options={options}
          groupBy={(option) => option.flag?.displayName}
        />,
      );
    });

    const input = container!.querySelector('[data-combobox-input]') as HTMLInputElement;
    enterText(input, 'korean');

    expect(container!.querySelectorAll('[data-combobox-item]')).toHaveLength(1);
    expect(container!.querySelector('[data-combobox-item="voice-a"]')).toBeNull();
    expect(container!.querySelector('[data-combobox-item="voice-b"]')).not.toBeNull();
    expect(container!.querySelector('[data-combobox-item-group-label]')?.textContent).toBe('Korean');
  });

  it('calls onValueChange when a searchable item is picked', () => {
    let received = '';
    act(() => {
      root!.render(
        <Select
          searchable
          value="a"
          onValueChange={(next) => {
            received = next;
          }}
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ]}
        />,
      );
    });

    const item = container!.querySelector('[data-combobox-item="b"]') as HTMLElement;
    act(() => {
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(received).toBe('b');
  });

  it('renders the searchable empty state when no items match', () => {
    act(() => {
      root!.render(
        <Select
          searchable
          options={[{ value: 'voice-a', label: 'Voice A' }]}
        />,
      );
    });

    expect(container!.querySelector('[data-combobox-empty]')).toBeNull();
    const input = container!.querySelector('[data-combobox-input]') as HTMLInputElement;
    enterText(input, 'xyz_no_match');

    expect(container!.querySelector('[data-combobox-item]')).toBeNull();
    expect(container!.querySelector('[data-combobox-empty]')?.textContent).toBe('No matches.');
  });

  it('resets searchable filtering when the dropdown closes', () => {
    const options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ];
    act(() => {
      root!.render(<Select searchable options={options} />);
    });

    const input = container!.querySelector('[data-combobox-input]') as HTMLInputElement;
    enterText(input, 'alpha');
    expect(container!.querySelectorAll('[data-combobox-item]')).toHaveLength(1);

    const trigger = container!.querySelector('[data-combobox-trigger]') as HTMLElement;
    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(input.value).toBe('');
    expect(container!.querySelectorAll('[data-combobox-item]')).toHaveLength(2);
  });

  it('pins a high-priority group to the top via groupOrder, ignoring item count', () => {
    const options: SelectOption[] = [
      // Two English voices
      { value: 'English_A', label: 'English A', flag: { countryCode: 'gb', displayName: 'English', fallbackEmoji: '🌐' } },
      { value: 'English_B', label: 'English B', flag: { countryCode: 'gb', displayName: 'English', fallbackEmoji: '🌐' } },
      // Three Korean voices (more than English, so without groupOrder Korean would render first)
      { value: 'Korean_A', label: 'Korean A', flag: { countryCode: 'kr', displayName: 'Korean', fallbackEmoji: '🌐' } },
      { value: 'Korean_B', label: 'Korean B', flag: { countryCode: 'kr', displayName: 'Korean', fallbackEmoji: '🌐' } },
      { value: 'Korean_C', label: 'Korean C', flag: { countryCode: 'kr', displayName: 'Korean', fallbackEmoji: '🌐' } },
      // One user voice (cloned) — no flag, would land in fallback group
      { value: 'my_clone_1', label: 'My Clone' },
    ];

    act(() => {
      root!.render(
        <Select
          options={options}
          groupBy={(option) => option.flag?.displayName ?? 'My Voices'}
          groupOrder={(key) => (key === 'My Voices' ? -1 : 0)}
        />,
      );
    });

    const labels = Array.from(container!.querySelectorAll('[data-item-group-label]')).map(
      (el) => el.textContent,
    );
    expect(labels[0]).toBe('My Voices');
    // English and Korean follow in count-desc order (Korean 3 > English 2)
    expect(labels).toEqual(['My Voices', 'Korean', 'English']);
  });

  it('filters out groups that have no items', () => {
    // No user voices — only system voices with flags. groupBy falls back to 'My Voices' but the group ends up empty.
    const options: SelectOption[] = [
      { value: 'English_A', label: 'English A', flag: { countryCode: 'gb', displayName: 'English', fallbackEmoji: '🌐' } },
      { value: 'Korean_A', label: 'Korean A', flag: { countryCode: 'kr', displayName: 'Korean', fallbackEmoji: '🌐' } },
    ];

    act(() => {
      root!.render(
        <Select
          options={options}
          groupBy={(option) => option.flag?.displayName ?? 'My Voices'}
        />,
      );
    });

    const labels = Array.from(container!.querySelectorAll('[data-item-group-label]')).map(
      (el) => el.textContent,
    );
    expect(labels).not.toContain('My Voices');
    // Both groups have count 1, so the tiebreak is alphabetical asc → English first.
    expect(labels).toEqual(['English', 'Korean']);
  });

  it('updates searchable items when options change', () => {
    act(() => {
      root!.render(
        <Select searchable options={[{ value: 'a', label: 'A' }]} />,
      );
    });

    expect(container!.querySelector('[data-combobox-item="a"]')).not.toBeNull();

    act(() => {
      root!.render(
        <Select searchable options={[{ value: 'b', label: 'B' }]} />,
      );
    });

    expect(container!.querySelector('[data-combobox-item="a"]')).toBeNull();
    expect(container!.querySelector('[data-combobox-item="b"]')).not.toBeNull();
  });
});
