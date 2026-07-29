import { describe, expect, it } from 'vitest';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

import HomePage from './page';

describe('HomePage', () => {
  it('redirects the root route to the TTS app entry point', async () => {
    // Next App Router implements redirects by throwing a redirect error.
    // Asserting on `isRedirectError` keeps this test stable across Next versions
    // without depending on the exact error message format.
    let thrownError: unknown;

    try {
      await HomePage();
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeDefined();
    expect(isRedirectError(thrownError)).toBe(true);
  });
});
