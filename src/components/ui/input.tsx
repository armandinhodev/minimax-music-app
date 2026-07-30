"use client";

import { Input as ChakraInput } from "@chakra-ui/react";

function Input({ className, ...props }: React.ComponentProps<typeof ChakraInput>) {
  return (
    <ChakraInput
      className={className}
      height="2rem"
      px="0.625rem"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.300"
      bg="white"
      fontSize="sm"
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

export { Input };
