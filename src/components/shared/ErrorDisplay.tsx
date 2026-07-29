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
  /**
   * Diagnostic detail from the upstream API (e.g. MiniMax status code +
   * upstream message). Rendered as a small muted line below the main
   * message so the user can report concrete numbers when debugging.
   */
  details?: {
    upstreamStatus?: number;
    upstreamMessage?: string;
  };
}

export function ErrorDisplay({
  code,
  message,
  title = 'Error',
  details,
}: ErrorDisplayProps) {
  const displayMessage = message ?? (code != null ? ERROR_CODE_MESSAGES[code] : null) ?? 'An unexpected error occurred.';
  const displayTitle = code != null ? `${title} ${code}` : title;
  const showDetails = details && (details.upstreamStatus !== undefined || details.upstreamMessage);

  return (
    <Alert variant="destructive">
      <AlertTitle>{displayTitle}</AlertTitle>
      <AlertDescription>{displayMessage}</AlertDescription>
      {showDetails && (
        <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.85 }}>
          {details!.upstreamStatus !== undefined && (
            <>Upstream HTTP {details!.upstreamStatus}. </>
          )}
          {details!.upstreamMessage && (
            <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0 0.25rem', borderRadius: '0.25rem' }}>
              {details!.upstreamMessage}
            </code>
          )}
        </p>
      )}
    </Alert>
  );
}
