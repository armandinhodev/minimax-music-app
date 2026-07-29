/**
 * MiniMax infrastructure configuration.
 * Base URL, auth header factory, and shared error parser.
 * @server-only — this module must never be bundled for the browser.
 */

import 'server-only';

/** MiniMax API base URL */
export const MINIMAX_BASE_URL = 'https://api.minimax.io' as const;

/**
 * Factory — builds the Authorization header value for a given API key.
 * Returns `Bearer <key>` for use in fetch headers.
 */
export function buildAuthHeader(apiKey: string): string {
  return `Bearer ${apiKey}`;
}

/**
 * Normalized MiniMax API error shape.
 */
export interface MiniMaxApiError {
  code: number;
  message: string;
  /** Original HTTP status code */
  status?: number;
  retryAfterSeconds?: number;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status < 600);
}

function resolveApplicationErrorStatus(code: number, responseStatus: number): number {
  if (isRetryableStatus(code)) {
    return code;
  }

  if (code >= 400 && code < 500) {
    return code;
  }

  return responseStatus;
}

export function parseRetryAfterSeconds(retryAfterHeader: string | null): number | undefined {
  if (!retryAfterHeader) return undefined;

  const numeric = Number(retryAfterHeader);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.ceil(numeric);
  }

  const retryDate = Date.parse(retryAfterHeader);
  if (Number.isNaN(retryDate)) {
    return undefined;
  }

  const seconds = Math.ceil((retryDate - Date.now()) / 1000);
  return seconds > 0 ? seconds : 0;
}

/**
 * Parses a non-2xx fetch response body into a MiniMaxApiError.
 * Falls back to a generic 500 if the body cannot be parsed.
 */
export function parseMiniMaxError(response: Response, body: unknown): MiniMaxApiError {
  const raw = body as Record<string, unknown> | undefined;
  const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get('retry-after'));

  // MiniMax error shape: { code: number, message: string }
  if (typeof raw?.code === 'number' && typeof raw?.message === 'string') {
    return {
      code: raw.code as number,
      message: raw.message as string,
      status: response.status,
      retryAfterSeconds,
    };
  }

  // Fallback for unexpected error shapes
  return {
    code: response.status,
    message: response.statusText || 'MiniMax API request failed',
    status: response.status,
    retryAfterSeconds,
  };
}

export function parseMiniMaxApplicationError(
  responseStatus: number,
  baseResp: { status_code: number; status_msg?: string }
): MiniMaxApiError {
  return {
    code: baseResp.status_code,
    message: baseResp.status_msg ?? 'MiniMax API error',
    status: resolveApplicationErrorStatus(baseResp.status_code, responseStatus),
  };
}

/**
 * Checks whether the MINIMAX_API_KEY environment variable is configured.
 * Throws if missing — call this at module load time in server-only paths.
 */
export function requireMiniMaxApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) {
    throw new Error('MINIMAX_API_KEY environment variable is not set');
  }
  return key;
}
