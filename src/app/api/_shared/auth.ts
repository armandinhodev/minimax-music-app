/**
 * Shared server-only auth utilities for Route Handlers.
 * Validates APP_ACCESS_KEY bearer tokens.
 */

import { NextResponse } from 'next/server';

/**
 * The name of the APP_ACCESS_KEY environment variable.
 */
export const APP_ACCESS_KEY_ENV = 'APP_ACCESS_KEY';

/**
 * Retrieves the configured APP_ACCESS_KEY from environment.
 * Returns undefined if the key is missing or blank.
 */
function getAppAccessKey(): string | undefined {
  const key = process.env[APP_ACCESS_KEY_ENV];
  if (!key || typeof key !== 'string' || key.trim() === '') {
    return undefined;
  }
  return key;
}

/**
 * Validates the Authorization header as a Bearer token against APP_ACCESS_KEY.
 * Fails CLOSED: returns false if APP_ACCESS_KEY is missing/blank, or if the
 * Authorization header does not match the expected Bearer token.
 * "Bearer undefined" must never authorize.
 */
export function isAuthorized(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const key = getAppAccessKey();
  // Fail closed: no configured key = unauthorized
  if (!key) return false;
  const expected = `Bearer ${key}`;
  return authHeader === expected;
}

/**
 * Creates a 401 Unauthorized NextResponse.
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Middleware-style guard for Route Handlers.
 * Returns a 401 response if the request is not authorized.
 * Use at the top of each handler that needs auth.
 */
export function requireAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  if (!isAuthorized(authHeader)) {
    return unauthorizedResponse();
  }
  return null;
}
