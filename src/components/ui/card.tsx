"use client";

import { Box, type BoxProps } from "@chakra-ui/react";

const cardPadding = "1rem";

interface CardProps extends BoxProps {
  size?: "default" | "sm";
}

function Card({ size = "default", ...props }: CardProps) {
  const padding = size === "sm" ? "0.75rem" : cardPadding;
  return (
    <Box
      bg="white"
      borderRadius="xl"
      p={padding}
      boxShadow="sm"
      border="1px solid"
      borderColor="gray.200"
      {...props}
    />
  );
}

function CardHeader({ ...props }: BoxProps) {
  return <Box px={cardPadding} pt={cardPadding} pb="0" {...props} />;
}

function CardTitle({ ...props }: BoxProps) {
  return <Box fontSize="base" fontWeight="medium" lineHeight="snug" {...props} />;
}

function CardDescription({ ...props }: BoxProps) {
  return <Box fontSize="sm" color="gray.600" mt="0.25rem" {...props} />;
}

function CardContent({ ...props }: BoxProps) {
  return <Box px={cardPadding} py="0.5rem" {...props} />;
}

function CardFooter({ ...props }: BoxProps) {
  return (
    <Box
      display="flex"
      alignItems="center"
      borderTop="1px solid"
      borderColor="gray.200"
      bg="gray.50"
      p={cardPadding}
      borderBottomRadius="xl"
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
