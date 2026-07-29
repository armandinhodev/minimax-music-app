'use client';

/**
 * Custom popover-based select that supports flag images inside option rows.
 *
 * Native HTML <select> elements cannot contain <img> inside <option> — that's
 * a browser-standard limitation, not a code choice. Showing real flag images
 * requires a popover-based listbox. We delegate to Chakra UI v3's `Select.Root`
 * which is built on top of Ark UI's Select primitive; it supports arbitrary
 * children inside `Select.Item` (so we can render <img>) and provides full
 * keyboard navigation, ARIA wiring, and a portal-based positioning layer.
 *
 * Public API mirrors the previous native wrapper:
 *   - `value` is a single string (the component internally maps to Chakra's
 *     `string[]` shape).
 *   - `options` can carry an optional `flag` (LanguageInfo) — when present
 *     we render a real flagcdn.com flag <img>; when `countryCode` is missing
 *     we fall back to the emoji defined in LanguageInfo.
 *   - Optional `groupBy` groups items visually under `ItemGroup` + `ItemGroupLabel`.
 *     Group ordering: count desc, then key asc (mirrors the /voices page sort).
 */

import { useMemo, useState } from 'react';
import { Box, Portal, Select as ChakraSelect, createListCollection } from '@chakra-ui/react';
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

function OptionContent({ option }: { option: SelectOption }) {
  return (
    <Box display="inline-flex" alignItems="center" gap={2} width="100%">
      {option.flag && <FlagImage flag={option.flag} size={FLAG_SIZE_PX} />}
      <ChakraSelect.ItemText>{option.label}</ChakraSelect.ItemText>
    </Box>
  );
}

function UngroupedItem({ option }: { option: SelectOption }) {
  return (
    <ChakraSelect.Item key={option.value} item={option}>
      <OptionContent option={option} />
      <ChakraSelect.ItemIndicator />
    </ChakraSelect.Item>
  );
}

function GroupedItems({ groupKey, options: groupOptions }: { groupKey: string; options: SelectOption[] }) {
  return (
    <ChakraSelect.ItemGroup key={groupKey} id={groupKey}>
      <ChakraSelect.ItemGroupLabel>{groupKey}</ChakraSelect.ItemGroupLabel>
      {groupOptions.map((opt) => (
        <UngroupedItem key={opt.value} option={opt} />
      ))}
    </ChakraSelect.ItemGroup>
  );
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  id,
  className,
  groupBy,
}: SelectProps) {
  const collection = useMemo(
    () => createListCollection({ items: options }),
    [options],
  );

  const groupedOptions = useMemo<{ key: string | undefined; options: SelectOption[] }[]>(() => {
    if (!groupBy) return [{ key: undefined, options }];
    const map = new Map<string, SelectOption[]>();
    for (const opt of options) {
      const key = groupBy(opt) ?? '';
      const list = map.get(key);
      if (list) list.push(opt);
      else map.set(key, [opt]);
    }
    return Array.from(map.entries())
      .sort(([aKey, aItems], [bKey, bItems]) => {
        if (bItems.length !== aItems.length) return bItems.length - aItems.length;
        return aKey.localeCompare(bKey);
      })
      .map(([key, groupItems]) => ({ key: key === '' ? undefined : key, options: groupItems }));
  }, [options, groupBy]);

  const selectedOption = value ? options.find((o) => o.value === value) : undefined;

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
            {groupedOptions.map(({ key, options: groupOptions }) =>
              key === undefined ? (
                groupOptions.map((opt) => <UngroupedItem key={opt.value} option={opt} />)
              ) : (
                <GroupedItems key={key} groupKey={key} options={groupOptions} />
              ),
            )}
          </ChakraSelect.Content>
        </ChakraSelect.Positioner>
      </Portal>
    </ChakraSelect.Root>
  );
}
