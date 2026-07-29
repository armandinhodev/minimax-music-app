"use client";

import { Box } from "@chakra-ui/react";
import type { BoxProps } from "@chakra-ui/react";

function Skeleton({ ...props }: BoxProps) {
  return (
    <Box
      borderRadius="md"
      bg="gray.200"
      animation="pulse"
      css={{
        "@keyframes pulse": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
      }}
      {...props}
    />
  );
}

export { Skeleton };
