"use client";

import { Box } from "@chakra-ui/react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  options?: SelectOption[];
}

function Select({ value, onValueChange, children, className, disabled, id, placeholder, options }: SelectProps) {
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
        {options ? options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>) : children}
      </select>
      <Box position="absolute" right="0.625rem" top="50%" transform="translateY(-50%)" pointerEvents="none" color="gray.500" fontSize="0.75rem">
        ▼
      </Box>
    </Box>
  );
}

function SelectTrigger({ children, id }: { children?: React.ReactNode; className?: string; id?: string }) {
  return <Box id={id}>{children}</Box>;
}

function SelectContent({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <Box className={className}>{children}</Box>;
}

function SelectItem({ value, children, className }: { value: string; children?: React.ReactNode; className?: string }) {
  return <option value={value} className={className}>{children}</option>;
}

function SelectValue({ children, placeholder }: { children?: React.ReactNode; placeholder?: string }) {
  return <>{children || placeholder}</>;
}

function SelectLabel({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <optgroup label={children as string} className={className}>{children}</optgroup>;
}

function SelectGroup({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <optgroup className={className}>{children}</optgroup>;
}

function SelectSeparator({ className }: { className?: string }) {
  return <option disabled className={className}>────────</option>;
}

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectLabel,
  SelectGroup,
  SelectSeparator,
};
