'use client';

/**
 * Client-side auth utilities for making authenticated API calls.
 * Reads the app access key from sessionStorage and attaches it as
 * Authorization: Bearer <key> header.
 */

import { getAppAccessKey } from '@/components/shared/AppKeyGate';

const APP_KEY_STORAGE = 'app_access_key';

/**
 * Build the Authorization header value from sessionStorage.
 * Returns null if no key is stored.
 */
export function buildAuthHeader(): string | null {
  const key = getAppAccessKey();
  if (!key) return null;
  return `Bearer ${key}`;
}

/**
 * Make an authenticated fetch call.
 * Attaches Authorization: Bearer <key> from sessionStorage.
 * Returns the Response directly; caller handles error parsing.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeader = buildAuthHeader();

  if (!authHeader) {
    // Redirect to login if no key — simulate a 401
    window.location.href = '/login';
    return new Response(null, { status: 401 });
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: authHeader,
    },
  });

  // If API returns 401, clear the stored key and redirect to login
  if (response.status === 401) {
    sessionStorage.removeItem(APP_KEY_STORAGE);
    window.location.href = '/login';
  }

  return response;
}

/**
 * Validate a key against the server before storing it.
 * Returns true if the key is valid, false otherwise.
 */
export async function validateAppAccessKey(key: string): Promise<boolean> {
  const response = await fetch('/api/auth/validate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });

  return response.ok;
}

/**
 * Parse an error response body from an API call.
 * Returns null if the response was ok.
 */
export async function parseApiError(response: Response): Promise<{
  code: number | null;
  message: string | null;
  retryable?: boolean;
  retryAfterSeconds?: number | null;
  details?: { upstreamStatus?: number; upstreamMessage?: string };
} | null> {
  if (response.ok) return null;

  try {
    const data = await response.json();
    const code = typeof data.code === 'number' ? data.code : null;
    const message = typeof data.error === 'string' ? data.error : null;
    const retryable = typeof data.retryable === 'boolean' ? data.retryable : undefined;
    const retryAfterSeconds = typeof data.retryAfterSeconds === 'number' ? data.retryAfterSeconds : null;
    const details = data.details && typeof data.details === 'object' ? data.details : undefined;
    return { code, message, retryable, retryAfterSeconds, details };
  } catch {
    return {
      code: null,
      message: `HTTP ${response.status}`,
      details: { upstreamStatus: response.status },
    };
  }
}
