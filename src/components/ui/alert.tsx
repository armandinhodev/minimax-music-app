"use client";

import { Box } from "@chakra-ui/react";
import type { BoxProps } from "@chakra-ui/react";

interface AlertProps extends BoxProps {
  variant?: "default" | "destructive";
}

function Alert({ variant = "default", ...props }: AlertProps) {
  const bg = variant === "destructive" ? "red.50" : "white";
  const borderColor = variant === "destructive" ? "red.200" : "gray.200";

  return (
    <Box
      position="relative"
      display="grid"
      gap="0.5rem"
      p="0.5rem 0.625rem"
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      bg={bg}
      fontSize="sm"
      textAlign="left"
      {...props}
    />
  );
}

function AlertTitle({ ...props }: BoxProps) {
  return <Box fontWeight="medium" {...props} />;
}

function AlertDescription({ ...props }: BoxProps) {
  return <Box fontSize="sm" color="gray.600" {...props} />;
}

export { Alert, AlertTitle, AlertDescription };
