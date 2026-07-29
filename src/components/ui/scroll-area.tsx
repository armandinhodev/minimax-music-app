"use client";

import { Box } from "@chakra-ui/react";
import type { BoxProps } from "@chakra-ui/react";

interface ScrollAreaProps extends BoxProps {
  children: React.ReactNode;
}

function ScrollArea({ children, ...props }: ScrollAreaProps) {
  return (
    <Box position="relative" overflow="hidden" {...props}>
      <Box overflowY="auto" height="100%">
        {children}
      </Box>
    </Box>
  );
}

export { ScrollArea };
