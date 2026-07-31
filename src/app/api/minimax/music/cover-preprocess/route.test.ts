/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/application/use-cases/music/PreprocessMusicCover', () => ({
  PreprocessMusicCoverUseCase: vi.fn().mockImplementation(() => ({
    execute: executeMock,
  })),
}));

vi.mock('@/infrastructure/minimax/MiniMaxMusicClient', () => ({
  MiniMaxMusicClient: vi.fn().mockImplementation(() => ({})),
}));

describe('POST /api/minimax/music/cover-preprocess', () => {
  beforeEach(() => {
    process.env.APP_ACCESS_KEY = 'test-key';
    executeMock.mockReset();
  });

  it('validates and returns cover preprocess metadata', async () => {
    const { POST } = await import('./route');
    executeMock.mockResolvedValue({
      coverFeatureId: 'cover-feature-1',
      formattedLyrics: '[Verse]\nCity lights',
      structureResult: '{"sections":["Verse"]}',
      audioDurationSeconds: 42,
      traceId: 'trace-cover-1',
      metadata: { status: 0, message: 'success' },
    });

    const response = await POST(new Request('http://localhost/api/minimax/music/cover-preprocess', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioUrl: 'https://example.com/reference.mp3',
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      coverFeatureId: 'cover-feature-1',
      formattedLyrics: '[Verse]\nCity lights',
      structureResult: '{"sections":["Verse"]}',
      audioDurationSeconds: 42,
      traceId: 'trace-cover-1',
      metadata: { status: 0, message: 'success' },
    });
    expect(executeMock).toHaveBeenCalledWith(expect.objectContaining({
      model: 'music-cover',
      audioUrl: 'https://example.com/reference.mp3',
      audioBase64: '',
    }));
  });

  it('rejects duplicate reference audio sources before calling MiniMax', async () => {
    const { POST } = await import('./route');

    const response = await POST(new Request('http://localhost/api/minimax/music/cover-preprocess', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioUrl: 'https://example.com/reference.mp3',
        audioBase64: Buffer.from('reference audio').toString('base64'),
      }),
    }));

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('requires app auth', async () => {
    const { POST } = await import('./route');

    const response = await POST(new Request('http://localhost/api/minimax/music/cover-preprocess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioUrl: 'https://example.com/reference.mp3' }),
    }));

    expect(response.status).toBe(401);
    expect(executeMock).not.toHaveBeenCalled();
  });
});
