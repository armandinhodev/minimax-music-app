"use client";

import { Box } from "@chakra-ui/react";
import type { BoxProps } from "@chakra-ui/react";

interface SeparatorProps extends BoxProps {
  orientation?: "horizontal" | "vertical";
}

function Separator({ orientation = "horizontal", ...props }: SeparatorProps) {
  const isHorizontal = orientation === "horizontal";
  return (
    <Box
      flexShrink={0}
      bg="gray.200"
      height={isHorizontal ? "1px" : "100%"}
      width={isHorizontal ? "100%" : "1px"}
      alignSelf="stretch"
      {...props}
    />
  );
}

export { Separator };
