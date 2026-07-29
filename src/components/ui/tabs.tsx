"use client";

import { createContext, useContext, useState } from "react";
import { Box } from "@chakra-ui/react";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  children?: React.ReactNode;
  className?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

function Tabs({ children, className, defaultValue = "", value: controlledValue, onValueChange }: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <Box display="flex" flexDirection="column" gap="0.5rem" className={className}>
        {children}
      </Box>
    </TabsContext.Provider>
  );
}

function TabsList({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      width="fit-content"
      padding="3px"
      borderRadius="0.5rem"
      background="gray.100"
      gap="0.25rem"
      className={className}
    >
      {children}
    </Box>
  );
}

function TabsTrigger({ children, className, value }: { children?: React.ReactNode; className?: string; value?: string }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.value === value;

  return (
    <button
      type="button"
      onClick={() => value && context.onValueChange(value)}
      style={{
        height: "1.75rem",
        paddingLeft: "0.375rem",
        paddingRight: "0.375rem",
        fontSize: "0.875rem",
        fontWeight: 500,
        borderRadius: "0.375rem",
        color: isActive ? "#2b6cb0" : "#718096",
        background: isActive ? "white" : "transparent",
        border: "none",
        cursor: "pointer",
        boxShadow: isActive ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)" : "none",
        transition: "all 0.15s",
      }}
      className={className}
    >
      {children}
    </button>
  );
}

function TabsContent({ children, className, value, style }: { children?: React.ReactNode; className?: string; value?: string; style?: React.CSSProperties }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.value !== value) return null;

  return (
    <Box flex="1" fontSize="0.875rem" className={className} style={style}>
      {children}
    </Box>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
