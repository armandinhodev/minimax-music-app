/** @vitest-environment node */

/**
 * Auth validate unit tests — tests the isAuthorized utility function.
 *
 * Note: Testing the route handler itself would require supertest or similar HTTP
 * testing library. Here we test the core auth logic that the route handler delegates to.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock server-only to prevent actual server-only imports from failing in test env
vi.mock('server-only', () => ({}));

describe('isAuthorized', () => {
  // We import the function directly to test its logic
  // In a real scenario we'd use proper env mocking via vitest's env support

  it('returns false when authHeader is null', async () => {
    const { isAuthorized } = await import('@/app/api/_shared/auth');

    // Save original env
    const original = process.env.APP_ACCESS_KEY;
    process.env.APP_ACCESS_KEY = 'test_secret_key';

    try {
      expect(isAuthorized(null)).toBe(false);
    } finally {
      process.env.APP_ACCESS_KEY = original;
    }
  });

  it('returns false when authHeader is empty string', async () => {
    const { isAuthorized } = await import('@/app/api/_shared/auth');

    const original = process.env.APP_ACCESS_KEY;
    process.env.APP_ACCESS_KEY = 'test_secret_key';

    try {
      expect(isAuthorized('')).toBe(false);
    } finally {
      process.env.APP_ACCESS_KEY = original;
    }
  });

  it('returns true when authHeader matches expected Bearer token', async () => {
    const { isAuthorized } = await import('@/app/api/_shared/auth');

    const original = process.env.APP_ACCESS_KEY;
    process.env.APP_ACCESS_KEY = 'my_secret_key';

    try {
      expect(isAuthorized('Bearer my_secret_key')).toBe(true);
    } finally {
      process.env.APP_ACCESS_KEY = original;
    }
  });

  it('trims configured APP_ACCESS_KEY whitespace before comparing', async () => {
    const { isAuthorized } = await import('@/app/api/_shared/auth');

    const original = process.env.APP_ACCESS_KEY;
    process.env.APP_ACCESS_KEY = '  my_secret_key  ';

    try {
      expect(isAuthorized('Bearer my_secret_key')).toBe(true);
    } finally {
      process.env.APP_ACCESS_KEY = original;
    }
  });

  it('accepts APP_ACCESS_TOKEN as a compatibility alias', async () => {
    const { isAuthorized } = await import('@/app/api/_shared/auth');

    const originalKey = process.env.APP_ACCESS_KEY;
    const originalToken = process.env.APP_ACCESS_TOKEN;
    delete process.env.APP_ACCESS_KEY;
    process.env.APP_ACCESS_TOKEN = 'token_secret';

    try {
      expect(isAuthorized('Bearer token_secret')).toBe(true);
    } finally {
      if (originalKey === undefined) {
        delete process.env.APP_ACCESS_KEY;
      } else {
        process.env.APP_ACCESS_KEY = originalKey;
      }
      if (originalToken === undefined) {
        delete process.env.APP_ACCESS_TOKEN;
      } else {
        process.env.APP_ACCESS_TOKEN = originalToken;
      }
    }
  });

  it('returns false when authHeader does not match APP_ACCESS_KEY', async () => {
    const { isAuthorized } = await import('@/app/api/_shared/auth');

    const original = process.env.APP_ACCESS_KEY;
    process.env.APP_ACCESS_KEY = 'correct_key';

    try {
      expect(isAuthorized('Bearer wrong_key')).toBe(false);
    } finally {
      process.env.APP_ACCESS_KEY = original;
    }
  });

  it('returns false when APP_ACCESS_KEY is undefined', async () => {
    const { isAuthorized } = await import('@/app/api/_shared/auth');

    const original = process.env.APP_ACCESS_KEY;
    delete process.env.APP_ACCESS_KEY;

    try {
      expect(isAuthorized('Bearer any_key')).toBe(false);
    } finally {
      process.env.APP_ACCESS_KEY = original;
    }
  });

  it('returns true for Bearer prefix with exact key match', async () => {
    const { isAuthorized } = await import('@/app/api/_shared/auth');

    const original = process.env.APP_ACCESS_KEY;
    process.env.APP_ACCESS_KEY = 'Bearer test-key';

    try {
      // When APP_ACCESS_KEY itself starts with "Bearer " it should still match exactly
      expect(isAuthorized('Bearer Bearer test-key')).toBe(true);
    } finally {
      process.env.APP_ACCESS_KEY = original;
    }
  });

  // --- Fail-closed security regression tests ---

  it('returns false (fail closed) when APP_ACCESS_KEY is undefined — Bearer undefined must not authorize', async () => {
    const { isAuthorized } = await import('@/app/api/_shared/auth');

    const original = process.env.APP_ACCESS_KEY;
    delete process.env.APP_ACCESS_KEY;

    try {
      // "Bearer undefined" must NEVER authorize
      expect(isAuthorized('Bearer undefined')).toBe(false);
      // Any other key must also not authorize when env is unset
      expect(isAuthorized('Bearer any_value')).toBe(false);
      expect(isAuthorized('Bearer abc123')).toBe(false);
    } finally {
      process.env.APP_ACCESS_KEY = original;
    }
  });

  it('returns false (fail closed) when APP_ACCESS_KEY is blank/empty string', async () => {
    const { isAuthorized } = await import('@/app/api/_shared/auth');

    const original = process.env.APP_ACCESS_KEY;
    process.env.APP_ACCESS_KEY = '';

    try {
      // Blank key must not authorize any Bearer token
      expect(isAuthorized('Bearer anything')).toBe(false);
      expect(isAuthorized('Bearer ')).toBe(false);
    } finally {
      process.env.APP_ACCESS_KEY = original;
    }
  });

  it('returns false when APP_ACCESS_KEY is whitespace-only string', async () => {
    const { isAuthorized } = await import('@/app/api/_shared/auth');

    const original = process.env.APP_ACCESS_KEY;
    process.env.APP_ACCESS_KEY = '   ';

    try {
      expect(isAuthorized('Bearer    ')).toBe(false);
    } finally {
      process.env.APP_ACCESS_KEY = original;
    }
  });
});

describe('requireAuth', () => {
  it('returns null (authorized) when auth header is valid', async () => {
    const { requireAuth } = await import('@/app/api/_shared/auth');

    const original = process.env.APP_ACCESS_KEY;
    process.env.APP_ACCESS_KEY = 'valid_key';

    try {
      const mockRequest = {
        headers: { get: () => 'Bearer valid_key' },
      } as unknown as Request;
      expect(requireAuth(mockRequest)).toBeNull();
    } finally {
      process.env.APP_ACCESS_KEY = original;
    }
  });

  it('returns 401 response when auth header is invalid', async () => {
    const { requireAuth } = await import('@/app/api/_shared/auth');

    const original = process.env.APP_ACCESS_KEY;
    process.env.APP_ACCESS_KEY = 'valid_key';

    try {
      const mockRequest = {
        headers: { get: () => 'Bearer invalid_key' },
      } as unknown as Request;
      const response = requireAuth(mockRequest);
      expect(response?.status).toBe(401);
    } finally {
      process.env.APP_ACCESS_KEY = original;
    }
  });
});
