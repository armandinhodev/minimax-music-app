"use client";

import { Box } from "@chakra-ui/react";
import type { BoxProps } from "@chakra-ui/react";

interface ProgressProps extends BoxProps {
  value?: number;
}

function Progress({ value, ...props }: ProgressProps) {
  return (
    <Box
      position="relative"
      height="0.25rem"
      borderRadius="full"
      bg="gray.100"
      overflow="hidden"
      {...props}
    >
      <Box
        position="absolute"
        top="0"
        left="0"
        height="100%"
        width={value ? `${value}%` : "0%"}
        bg="blue.500"
        borderRadius="full"
        transition="width 0.3s ease"
      />
    </Box>
  );
}

export { Progress };
