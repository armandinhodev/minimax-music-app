"use client";

import { Textarea as ChakraTextarea } from "@chakra-ui/react";

function Textarea({ className, ...props }: React.ComponentProps<typeof ChakraTextarea>) {
  return (
    <ChakraTextarea
      className={className}
      minHeight="4rem"
      px="0.625rem"
      py="0.5rem"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.300"
      bg="white"
      fontSize="base"
      _focus={{
        borderColor: "blue.500",
        boxShadow: "0 0 0 3px rgba(66, 153, 225, 0.4)",
        outline: "none",
      }}
      _placeholder={{ color: "gray.500" }}
      _disabled={{ opacity: 0.5, cursor: "not-allowed", bg: "white" }}
      {...props}
    />
  );
}

export { Textarea };
