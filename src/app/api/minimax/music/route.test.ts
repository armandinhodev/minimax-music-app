/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/application/use-cases/music/GenerateMusic', () => ({
  GenerateMusicUseCase: vi.fn().mockImplementation(() => ({
    execute: executeMock,
  })),
}));

vi.mock('@/infrastructure/minimax/MiniMaxMusicClient', () => ({
  MiniMaxMusicClient: vi.fn().mockImplementation(() => ({})),
}));

describe('POST /api/minimax/music', () => {
  beforeEach(() => {
    process.env.APP_ACCESS_KEY = 'test-key';
    executeMock.mockReset();
  });

  it('validates and returns generated music audio', async () => {
    const { POST } = await import('./route');
    executeMock.mockResolvedValue({
      id: 'trace-1',
      audio: '00010203',
      format: 'mp3',
      metadata: { durationSeconds: 118, sampleRate: 44100, bitrate: 256000 },
    });

    const response = await POST(new Request('http://localhost/api/minimax/music', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Glossy synth-pop with a bright chorus.',
        lyrics: '[Verse]\nCity lights\n[Chorus]\nRise again',
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: 'trace-1',
      audio: '00010203',
      format: 'mp3',
      metadata: { durationSeconds: 118, sampleRate: 44100, bitrate: 256000 },
    });
    expect(executeMock).toHaveBeenCalledWith(expect.objectContaining({
      model: 'music-3.0',
      prompt: 'Glossy synth-pop with a bright chorus.',
      lyrics: '[Verse]\nCity lights\n[Chorus]\nRise again',
      instrumental: false,
      stream: false,
      outputFormat: 'hex',
      audioSetting: { sampleRate: 44100, bitrate: 256000, format: 'mp3' },
    }));
  });

  it('passes instrumental requests to the use case without lyrics', async () => {
    const { POST } = await import('./route');
    executeMock.mockResolvedValue({ id: 'trace-2', audio: '00010203', format: 'mp3', metadata: {} });

    const response = await POST(new Request('http://localhost/api/minimax/music', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instrumental: true,
        prompt: 'Instrumental cinematic piano with soft strings.',
      }),
    }));

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalledWith(expect.objectContaining({
      instrumental: true,
      prompt: 'Instrumental cinematic piano with soft strings.',
      lyrics: '',
    }));
  });

  it('rejects invalid music requests before calling MiniMax', async () => {
    const { POST } = await import('./route');

    const response = await POST(new Request('http://localhost/api/minimax/music', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ instrumental: false, lyrics: '' }),
    }));

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('requires app auth', async () => {
    const { POST } = await import('./route');

    const response = await POST(new Request('http://localhost/api/minimax/music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyrics: '[Chorus]\nRise again' }),
    }));

    expect(response.status).toBe(401);
    expect(executeMock).not.toHaveBeenCalled();
  });
});
