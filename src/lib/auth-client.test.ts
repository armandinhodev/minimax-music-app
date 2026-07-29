import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/shared/AppKeyGate', () => ({
  getAppAccessKey: vi.fn(),
}));

import { parseApiError } from './auth-client';

describe('parseApiError', () => {
  it('parses retry metadata from API error bodies', async () => {
    const response = new Response(
      JSON.stringify({
        error: 'MiniMax is rate limiting requests. Please retry shortly.',
        code: 42901,
        retryable: true,
        retryAfterSeconds: 12,
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );

    await expect(parseApiError(response)).resolves.toEqual({
      code: 42901,
      message: 'MiniMax is rate limiting requests. Please retry shortly.',
      retryable: true,
      retryAfterSeconds: 12,
    });
  });
});
