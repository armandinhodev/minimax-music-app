"use client";

import { Box } from "@chakra-ui/react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Native <select> wrapper styled with Chakra Box.
 *
 * Important: this renders a real <select>, so only <option> elements may be
 * direct children. A previous compound API (SelectTrigger / SelectContent /
 * SelectItem) was removed because SelectTrigger and SelectContent wrapped
 * their children in <Box>, which produced invalid HTML when nested inside
 * the native <select> and triggered React hydration errors at runtime
 * ("In HTML, <div> cannot be a child of <select>."). See select.test.tsx
 * for the regression guard.
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  id,
  className,
}: SelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onValueChange?.(e.target.value);
  };

  return (
    <Box position="relative" display="inline-block" width="100%">
      <select
        id={id}
        className={className}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        style={{
          width: "100%",
          height: "2rem",
          paddingLeft: "0.625rem",
          paddingRight: "2rem",
          borderRadius: "0.5rem",
          border: "1px solid #d1d5db",
          fontSize: "0.875rem",
          background: "transparent",
          cursor: disabled ? "not-allowed" : "pointer",
          appearance: "none",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Box position="absolute" right="0.625rem" top="50%" transform="translateY(-50%)" pointerEvents="none" color="gray.500" fontSize="0.75rem">
        ▼
      </Box>
    </Box>
  );
}