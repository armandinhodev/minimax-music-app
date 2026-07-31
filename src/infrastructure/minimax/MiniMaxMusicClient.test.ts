/** @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MiniMaxMusicClient } from './MiniMaxMusicClient';

vi.mock('server-only', () => ({}));

describe('MiniMaxMusicClient', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.MINIMAX_API_KEY = 'test-minimax-key';
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sends MiniMax music_generation payload using hex MP3 output', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { audio: '00010203', status: 'Success' },
      trace_id: 'trace-1',
      extra_info: {
        music_duration: 118000,
        music_sample_rate: 44100,
        music_channel: 2,
        bitrate: 256000,
        music_size: 123456,
      },
      base_resp: { status_code: 0, status_msg: 'success' },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const result = await new MiniMaxMusicClient().generateMusic({
      model: 'music-3.0',
      prompt: 'Glossy synth-pop with a bright chorus.',
      lyrics: '[Verse]\nCity lights\n[Chorus]\nRise again',
      instrumental: false,
      stream: false,
      outputFormat: 'hex',
      audioSetting: { sampleRate: 44100, bitrate: 256000, format: 'mp3' },
    });

    expect(result).toEqual({
      id: 'trace-1',
      audio: '00010203',
      format: 'mp3',
      metadata: {
        status: 'Success',
        traceId: 'trace-1',
        durationSeconds: 118,
        sampleRate: 44100,
        channels: 2,
        bitrate: 256000,
        sizeBytes: 123456,
      },
    });

    const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.minimax.io/v1/music_generation');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-minimax-key',
    });
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'music-3.0',
      prompt: 'Glossy synth-pop with a bright chorus.',
      lyrics: '[Verse]\nCity lights\n[Chorus]\nRise again',
      stream: false,
      output_format: 'hex',
      audio_setting: { sample_rate: 44100, bitrate: 256000, format: 'mp3' },
    });
  });

  it('omits lyrics for instrumental music', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { audio: '00010203', status: 'Success' },
      trace_id: 'trace-instrumental',
      base_resp: { status_code: 0 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    await new MiniMaxMusicClient().generateMusic({
      model: 'music-3.0',
      prompt: 'Instrumental cinematic piano.',
      lyrics: '',
      instrumental: true,
      stream: false,
      outputFormat: 'hex',
      audioSetting: { sampleRate: 44100, bitrate: 256000, format: 'mp3' },
    });

    const [, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'music-3.0',
      prompt: 'Instrumental cinematic piano.',
      stream: false,
      output_format: 'hex',
      audio_setting: { sample_rate: 44100, bitrate: 256000, format: 'mp3' },
    });
  });

  it('does not retry transient generation failures to avoid duplicate music jobs', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        base_resp: { status_code: 429, status_msg: 'Slow down' },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { audio: '00010203', status: 'Success' },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    await expect(new MiniMaxMusicClient().generateMusic({
      model: 'music-3.0',
      prompt: 'Glossy synth-pop.',
      lyrics: '[Chorus]\nRise again',
      instrumental: false,
      stream: false,
      outputFormat: 'hex',
      audioSetting: { sampleRate: 44100, bitrate: 256000, format: 'mp3' },
    })).rejects.toMatchObject({ status: 429, code: 429 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects empty music audio responses with a 502-like client error', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { audio: '' },
      trace_id: 'trace-empty',
      base_resp: { status_code: 0 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    await expect(new MiniMaxMusicClient().generateMusic({
      model: 'music-3.0',
      prompt: 'Glossy synth-pop.',
      lyrics: '[Chorus]\nRise again',
      instrumental: false,
      stream: false,
      outputFormat: 'hex',
      audioSetting: { sampleRate: 44100, bitrate: 256000, format: 'mp3' },
    })).rejects.toMatchObject({
      name: 'MiniMaxMusicError',
      status: 502,
      message: 'MiniMax returned no music audio',
    });
  });
});
