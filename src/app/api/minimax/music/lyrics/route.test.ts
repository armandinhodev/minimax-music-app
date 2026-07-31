/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/application/use-cases/music/GenerateLyrics', () => ({
  GenerateLyricsUseCase: vi.fn().mockImplementation(() => ({
    execute: executeMock,
  })),
}));

vi.mock('@/infrastructure/minimax/MiniMaxMusicClient', () => ({
  MiniMaxMusicClient: vi.fn().mockImplementation(() => ({})),
}));

describe('POST /api/minimax/music/lyrics', () => {
  beforeEach(() => {
    process.env.APP_ACCESS_KEY = 'test-key';
    executeMock.mockReset();
  });

  it('validates and returns generated lyrics', async () => {
    const { POST } = await import('./route');
    executeMock.mockResolvedValue({
      songTitle: 'Neon Afterglow',
      styleTags: ['synth-pop'],
      lyrics: '[Verse]\nCity lights',
      metadata: { status: 0, message: 'success' },
    });

    const response = await POST(new Request('http://localhost/api/minimax/music/lyrics', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'write_full_song',
        prompt: 'Hopeful synth-pop.',
        title: 'Neon Afterglow',
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      songTitle: 'Neon Afterglow',
      styleTags: ['synth-pop'],
      lyrics: '[Verse]\nCity lights',
      metadata: { status: 0, message: 'success' },
    });
    expect(executeMock).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'write_full_song',
      prompt: 'Hopeful synth-pop.',
      title: 'Neon Afterglow',
      lyrics: '',
    }));
  });

  it('rejects invalid lyrics requests before calling MiniMax', async () => {
    const { POST } = await import('./route');

    const response = await POST(new Request('http://localhost/api/minimax/music/lyrics', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode: 'rewrite' }),
    }));

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('requires app auth', async () => {
    const { POST } = await import('./route');

    const response = await POST(new Request('http://localhost/api/minimax/music/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'write_full_song' }),
    }));

    expect(response.status).toBe(401);
    expect(executeMock).not.toHaveBeenCalled();
  });
});
