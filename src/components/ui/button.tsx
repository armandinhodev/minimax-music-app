"use client";

import { Button as ChakraButton, type ButtonProps as ChakraButtonProps } from "@chakra-ui/react";

type AppButtonVariant = "solid" | "outline" | "ghost" | "link" | "default" | "destructive";

interface ButtonProps extends Omit<ChakraButtonProps, "variant"> {
  variant?: AppButtonVariant;
}

function Button({ variant = "solid", colorPalette, _hover, type = "button", ...props }: ButtonProps) {
  const effectiveVariant = variant === "default" || variant === "destructive" ? "solid" : variant === "link" ? "plain" : variant;
  const effectiveColorPalette = colorPalette ?? (variant === "destructive" ? "red" : effectiveVariant === "solid" ? "green" : "gray");

  return (
    <ChakraButton
      type={type}
      variant={effectiveVariant}
      colorPalette={effectiveColorPalette}
      borderRadius="md"
      fontWeight="medium"
      transition="background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease"
      _hover={{ boxShadow: "sm", transform: "translateY(-1px)", ..._hover }}
      {...props}
    />
  );
}

export { Button };
