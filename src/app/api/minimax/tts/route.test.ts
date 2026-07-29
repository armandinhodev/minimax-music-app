/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/application/use-cases/tts/SynthesizeT2A', () => ({
  SynthesizeT2AUseCase: vi.fn().mockImplementation(() => ({
    execute: executeMock,
  })),
}));

vi.mock('@/infrastructure/minimax/MiniMaxSpeechClient', () => ({
  MiniMaxSpeechClient: vi.fn().mockImplementation(() => ({})),
}));

describe('POST /api/minimax/tts', () => {
  beforeEach(() => {
    process.env.APP_ACCESS_KEY = 'test-key';
    executeMock.mockReset();
  });

  it('returns safe 429 retry metadata without leaking upstream details', async () => {
    const { POST } = await import('./route');
    executeMock.mockRejectedValue(Object.assign(new Error('authorization=secret upstream rate limit'), {
      code: 42901,
      status: 429,
      retryAfterSeconds: 5,
    }));

    const response = await POST(new Request('http://localhost/api/minimax/tts', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'Hello world', voiceId: 'sys_voice_1' }),
    }));

    expect(response.status).toBe(429);
    const body = await response.json();

    expect(body).toEqual({
      error: 'MiniMax is rate limiting requests. Please retry shortly.',
      code: 42901,
      retryable: true,
      retryAfterSeconds: 5,
    });
    expect(JSON.stringify(body)).not.toContain('secret');
  }, 10_000);
});
