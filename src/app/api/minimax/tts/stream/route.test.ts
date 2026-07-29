/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/application/use-cases/tts/StreamT2A', () => ({
  StreamT2AUseCase: vi.fn().mockImplementation(() => ({
    execute: executeMock,
  })),
}));

vi.mock('@/infrastructure/minimax/MiniMaxSpeechClient', () => ({
  MiniMaxSpeechClient: vi.fn().mockImplementation(() => ({})),
}));

describe('POST /api/minimax/tts/stream', () => {
  beforeEach(() => {
    process.env.APP_ACCESS_KEY = 'test-key';
    executeMock.mockReset();
  });

  it('returns safe 5xx metadata without leaking upstream details', async () => {
    const { POST } = await import('./route');
    executeMock.mockRejectedValue(Object.assign(new Error('Bearer secret-token upstream unavailable'), {
      code: 50042,
      status: 502,
    }));

    const response = await POST(new Request('http://localhost/api/minimax/tts/stream', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'Hello', voiceId: 'sys_voice_1' }),
    }));

    expect(response.status).toBe(503);
    const body = await response.json();

    expect(body).toEqual({
      error: 'MiniMax is temporarily unavailable. Please retry shortly.',
      code: 50042,
      retryable: true,
    });
    expect(body).not.toHaveProperty('retryAfterSeconds');
    expect(JSON.stringify(body)).not.toContain('secret-token');
  }, 10_000);
});
