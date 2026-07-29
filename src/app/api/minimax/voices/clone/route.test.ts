/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceCloneNotVerifiedError } from '@/application/errors/VoiceCloneNotVerifiedError';

vi.mock('server-only', () => ({}));

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/application/use-cases/voice/CloneVoice', () => ({
  CloneVoiceUseCase: vi.fn().mockImplementation(() => ({
    execute: executeMock,
  })),
}));

vi.mock('@/infrastructure/minimax/MiniMaxSpeechClient', () => ({
  MiniMaxSpeechClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@/infrastructure/minimax/MiniMaxFileClient', () => ({
  MiniMaxFileClient: vi.fn().mockImplementation(() => ({})),
}));

describe('POST /api/minimax/voices/clone', () => {
  beforeEach(() => {
    process.env.APP_ACCESS_KEY = 'test-key';
    executeMock.mockReset();
  });

  it('returns the exact 2038 clone verification response', async () => {
    const { POST } = await import('./route');
    executeMock.mockRejectedValue(new VoiceCloneNotVerifiedError());

    const response = await POST(new Request('http://localhost/api/minimax/voices/clone', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId: 'file_123', voiceId: 'clone_voice_1' }),
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Voice cloning requires account verification.',
      code: 2038,
    });
  }, 10_000);

  it('returns safe retry metadata for rate limited clone failures without leaking secrets', async () => {
    const { POST } = await import('./route');
    executeMock.mockRejectedValue(Object.assign(new Error('Bearer secret-key upstream failure'), {
      code: 42901,
      status: 429,
      retryAfterSeconds: 9,
    }));

    const response = await POST(new Request('http://localhost/api/minimax/voices/clone', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId: 'file_123', voiceId: 'clone_voice_1' }),
    }));

    expect(response.status).toBe(429);
    const body = await response.json();

    expect(body).toEqual({
      error: 'MiniMax is rate limiting requests. Please retry shortly.',
      code: 42901,
      retryable: true,
      retryAfterSeconds: 9,
    });
    expect(JSON.stringify(body)).not.toContain('secret-key');
  });
});
