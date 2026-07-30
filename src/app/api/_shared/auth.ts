/**
 * Shared server-only auth utilities for Route Handlers.
 * Validates configured app access bearer tokens.
 */

import { NextResponse } from 'next/server';

/**
 * The supported app access environment variable names.
 */
export const APP_ACCESS_KEY_ENV = 'APP_ACCESS_KEY';
export const APP_ACCESS_TOKEN_ENV = 'APP_ACCESS_TOKEN';

/**
 * Retrieves the configured app access token from environment.
 * Returns undefined if the key is missing or blank.
 * APP_ACCESS_KEY is preferred; APP_ACCESS_TOKEN is kept as a compatibility alias.
 */
function getAppAccessKey(): string | undefined {
  for (const envName of [APP_ACCESS_KEY_ENV, APP_ACCESS_TOKEN_ENV]) {
    const key = process.env[envName];
    if (typeof key === 'string' && key.trim() !== '') {
      return key.trim();
    }
  }

  return undefined;
}

/**
 * Validates the Authorization header as a Bearer token against the configured key.
 * Fails CLOSED: returns false if the configured key is missing/blank, or if the
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
