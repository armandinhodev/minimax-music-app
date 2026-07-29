'use client';

/**
 * Custom selection control that supports flag images inside option rows.
 *
 * Native HTML <select> elements cannot contain <img> inside <option>, so the
 * default variant uses Chakra UI's popover-based Select primitive. The
 * searchable variant uses Chakra UI's Combobox primitive for integrated
 * filtering. Flags appear in combobox options only because an HTML <input>
 * cannot contain images.
 *
 * Public API keeps single-string values while mapping them to Chakra's
 * string-array value shape. Optional groups are ordered by item count
 * descending and then label ascending.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Box,
  Combobox,
  Portal,
  Select as ChakraSelect,
  createListCollection,
  useFilter,
  useListCollection,
} from '@chakra-ui/react';
import { getFlagUrl } from '@/lib/language-flags';
import type { LanguageInfo } from '@/lib/language-flags';

export interface SelectOption {
  value: string;
  label: string;
  /** Optional flag info; when present, renders an <img> (or fallback emoji) inside the option. */
  flag?: LanguageInfo;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** When provided, options are grouped under ItemGroup headers by the returned key. Undefined returns render ungrouped. */
  groupBy?: (option: SelectOption) => string | undefined;
  /** Optional sort priority for groups. Lower numbers render first; groups with the same priority fall back to count desc then alphabetical. Useful for pinning a special group (e.g. "My Voices") above the rest regardless of item count. */
  groupOrder?: (groupKey: string) => number;
  /** When true, renders an integrated search input inside the dropdown (combobox pattern). */
  searchable?: boolean;
}

interface FlagImageProps {
  flag: LanguageInfo;
  /** Height in px; the 4:3 aspect ratio is enforced via the flagcdn PNG endpoint. */
  size: number;
}

function FlagImage({ flag, size }: FlagImageProps) {
  const width = Math.round((size * 4) / 3);
  const url = flag.countryCode ? getFlagUrl(flag.countryCode, `${width}x${size}`) : null;
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <span aria-label={flag.displayName} style={{ fontSize: `${size}px`, lineHeight: 1 }}>
        {flag.fallbackEmoji}
      </span>
    );
  }
  return (
    <img
      src={url}
      width={width}
      height={size}
      alt={flag.displayName}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ display: 'block', flexShrink: 0 }}
    />
  );
}

const FLAG_SIZE_PX = 15;

function OptionContent({ option, children }: { option: SelectOption; children: ReactNode }) {
  return (
    <Box display="inline-flex" alignItems="center" gap={2} width="100%">
      {option.flag && <FlagImage flag={option.flag} size={FLAG_SIZE_PX} />}
      {children}
    </Box>
  );
}

interface OptionGroup {
  key: string | undefined;
  options: SelectOption[];
}

function groupOptions(
  options: SelectOption[],
  groupBy: SelectProps['groupBy'],
  groupOrder?: SelectProps['groupOrder'],
): OptionGroup[] {
  if (!groupBy) return [{ key: undefined, options }];

  const groups = new Map<string, SelectOption[]>();
  for (const option of options) {
    const key = groupBy(option) ?? '';
    const group = groups.get(key);
    if (group) group.push(option);
    else groups.set(key, [option]);
  }

  return Array.from(groups.entries())
    .sort(([aKey, aItems], [bKey, bItems]) => {
      if (groupOrder) {
        const ao = groupOrder(aKey);
        const bo = groupOrder(bKey);
        if (ao !== bo) return ao - bo;
      }
      if (bItems.length !== aItems.length) return bItems.length - aItems.length;
      return aKey.localeCompare(bKey);
    })
    .map(([key, groupItems]) => ({
      key: key === '' ? undefined : key,
      options: groupItems,
    }));
}

function BaseItem({ option }: { option: SelectOption }) {
  return (
    <ChakraSelect.Item item={option}>
      <OptionContent option={option}>
        <ChakraSelect.ItemText>{option.label}</ChakraSelect.ItemText>
      </OptionContent>
      <ChakraSelect.ItemIndicator />
    </ChakraSelect.Item>
  );
}

function BaseGroupedItems({ groupKey, options }: { groupKey: string; options: SelectOption[] }) {
  return (
    <ChakraSelect.ItemGroup id={groupKey}>
      <ChakraSelect.ItemGroupLabel>{groupKey}</ChakraSelect.ItemGroupLabel>
      {options.map((option) => (
        <BaseItem key={option.value} option={option} />
      ))}
    </ChakraSelect.ItemGroup>
  );
}

function BaseSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  id,
  className,
  groupBy,
  groupOrder,
}: SelectProps) {
  const collection = useMemo(
    () => createListCollection({ items: options }),
    [options],
  );
  const groupedOptions = useMemo(
    () => groupOptions(options, groupBy, groupOrder).filter((g) => g.options.length > 0),
    [options, groupBy, groupOrder],
  );
  const selectedOption = value ? options.find((option) => option.value === value) : undefined;

  return (
    <ChakraSelect.Root
      collection={collection}
      value={value ? [value] : []}
      onValueChange={(details) => {
        const next = details.value[0];
        if (next !== undefined) onValueChange?.(next);
      }}
      disabled={disabled}
      size="sm"
      width="100%"
      className={className}
      id={id}
    >
      <ChakraSelect.HiddenSelect />
      <ChakraSelect.Control>
        <ChakraSelect.Trigger>
          <ChakraSelect.ValueText placeholder={placeholder}>
            {selectedOption ? (
              <Box display="inline-flex" alignItems="center" gap={2}>
                {selectedOption.flag && <FlagImage flag={selectedOption.flag} size={FLAG_SIZE_PX} />}
                <span>{selectedOption.label}</span>
              </Box>
            ) : null}
          </ChakraSelect.ValueText>
        </ChakraSelect.Trigger>
        <ChakraSelect.IndicatorGroup>
          <ChakraSelect.Indicator />
        </ChakraSelect.IndicatorGroup>
      </ChakraSelect.Control>
      <Portal>
        <ChakraSelect.Positioner>
          <ChakraSelect.Content maxH="20rem">
            {groupedOptions.map(({ key, options: groupItems }) =>
              key === undefined ? (
                groupItems.map((option) => <BaseItem key={option.value} option={option} />)
              ) : (
                <BaseGroupedItems key={key} groupKey={key} options={groupItems} />
              ),
            )}
          </ChakraSelect.Content>
        </ChakraSelect.Positioner>
      </Portal>
    </ChakraSelect.Root>
  );
}

function SearchableItem({ option }: { option: SelectOption }) {
  return (
    <Combobox.Item item={option}>
      <OptionContent option={option}>
        <Combobox.ItemText>{option.label}</Combobox.ItemText>
      </OptionContent>
      <Combobox.ItemIndicator />
    </Combobox.Item>
  );
}

function SearchableGroupedItems({ groupKey, options }: { groupKey: string; options: SelectOption[] }) {
  return (
    <Combobox.ItemGroup id={groupKey}>
      <Combobox.ItemGroupLabel>{groupKey}</Combobox.ItemGroupLabel>
      {options.map((option) => (
        <SearchableItem key={option.value} option={option} />
      ))}
    </Combobox.ItemGroup>
  );
}

function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  id,
  className,
  groupBy,
  groupOrder,
}: SelectProps) {
  const { contains } = useFilter({ sensitivity: 'base' });
  const filterOption = useMemo(
    () => (_itemText: string, input: string, item: SelectOption) => {
      if (!input) return true;
      return (
        contains(item.label, input) ||
        contains(item.value, input) ||
        (item.flag?.displayName ? contains(item.flag.displayName, input) : false)
      );
    },
    [contains],
  );
  const { collection, filter, reset, set: setItems } = useListCollection<SelectOption>({
    initialItems: options,
    itemToString: (item) => item.label,
    itemToValue: (item) => item.value,
    filter: filterOption,
  });
  const selectedLabel = value
    ? options.find((option) => option.value === value)?.label ?? ''
    : '';
  const [inputValue, setInputValue] = useState(selectedLabel);

  useEffect(() => {
    setItems(options);
    setInputValue(selectedLabel);
  }, [options, selectedLabel, setItems]);

  const groupedOptions = useMemo(
    () =>
      groupOptions(collection.items, groupBy, groupOrder).filter((g) => g.options.length > 0),
    [collection.items, groupBy, groupOrder],
  );

  return (
    <Combobox.Root
      collection={collection}
      value={value ? [value] : []}
      inputValue={inputValue}
      onValueChange={(details) => {
        const next = details.value[0];
        if (next !== undefined) onValueChange?.(next);
      }}
      onInputValueChange={(details) => {
        setInputValue(details.inputValue);
        filter(details.inputValue);
      }}
      onOpenChange={(details) => {
        if (!details.open) {
          reset();
          const next = details.value[0];
          setInputValue(
            next ? options.find((option) => option.value === next)?.label ?? '' : '',
          );
        }
      }}
      disabled={disabled}
      size="sm"
      width="100%"
      className={className}
      id={id}
    >
      <Combobox.Control>
        <Combobox.Input placeholder={placeholder} />
        <Combobox.IndicatorGroup>
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content maxH="20rem">
            {groupedOptions.map(({ key, options: groupItems }) =>
              key === undefined ? (
                groupItems.map((option) => <SearchableItem key={option.value} option={option} />)
              ) : (
                <SearchableGroupedItems key={key} groupKey={key} options={groupItems} />
              ),
            )}
            <Combobox.Empty>No matches.</Combobox.Empty>
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  );
}

export function Select({ searchable = false, ...props }: SelectProps) {
  return searchable ? <SearchableSelect {...props} /> : <BaseSelect {...props} />;
}
