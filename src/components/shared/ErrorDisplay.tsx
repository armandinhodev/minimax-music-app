'use client';

/**
 * ErrorDisplay — normalized error message renderer.
 * Consults static ERROR_CODE_MESSAGES record for known codes.
 * Maps code 2038 to "Voice cloning requires account verification."
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ERROR_CODE_MESSAGES: Record<number, string> = {
  2038: 'Voice cloning requires account verification.',
};

interface ErrorDisplayProps {
  code?: number | null;
  message?: string | null;
  title?: string;
}

export function ErrorDisplay({
  code,
  message,
  title = 'Error',
}: ErrorDisplayProps) {
  const displayMessage = message ?? (code != null ? ERROR_CODE_MESSAGES[code] : null) ?? 'An unexpected error occurred.';
  const displayTitle = code != null ? `${title} ${code}` : title;

  return (
    <Alert variant="destructive">
      <AlertTitle>{displayTitle}</AlertTitle>
      <AlertDescription>{displayMessage}</AlertDescription>
    </Alert>
  );
}
