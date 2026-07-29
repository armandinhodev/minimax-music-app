import 'server-only';

import { captureServerError } from '@/lib/telemetry';
import type { MiniMaxApiError } from './MiniMaxConfig';

export async function readResponseBodyOnce(response: Response): Promise<unknown> {
  const rawText = await response.text();

  if (!rawText) {
    return undefined;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

export function emitUpstreamRetryTelemetry(error: MiniMaxApiError, operation: string, attemptNumber: number): void {
  captureServerError(Object.assign(new Error(error.message), error), {
    endpoint: '/minimax/upstream',
    method: 'RETRY',
    statusCode: error.status ?? 500,
    miniMaxCode: error.code,
    miniMaxMessage: error.message,
    operation,
    kind: 'upstream_retry',
    attemptNumber,
  });
}
