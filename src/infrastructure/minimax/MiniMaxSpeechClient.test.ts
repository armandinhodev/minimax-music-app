/** @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MiniMaxSpeechClient } from './MiniMaxSpeechClient';
import { setTelemetryReporterForTests } from '@/lib/telemetry';

vi.mock('server-only', () => ({}));

describe('MiniMaxSpeechClient', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.MINIMAX_API_KEY = 'test-minimax-key';
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    setTelemetryReporterForTests(null);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('extracts language prefixes from system voice IDs, including multi-word and edge-case prefixes', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      system_voice: {
        english: { voice_id: 'English_Friendly_Guy', name: 'Friendly Guy' },
        mandarin: { voice_id: 'Chinese (Mandarin)_News_Anchor', name: 'News Anchor' },
        robot: { voice_id: 'Robot_Armor', name: 'Armor' },
        arrogant: { voice_id: 'Arrogant_Miss', name: 'Miss' },
        plain: { voice_id: 'Standalone', name: 'Standalone' },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    const voices = await new MiniMaxSpeechClient().getVoices();
    expect(voices.map(({ voiceId, language }) => ({ voiceId, language }))).toEqual([
      { voiceId: 'English_Friendly_Guy', language: 'English' },
      { voiceId: 'Chinese (Mandarin)_News_Anchor', language: 'Chinese (Mandarin)' },
      { voiceId: 'Robot_Armor', language: 'Robot' },
      { voiceId: 'Arrogant_Miss', language: 'Arrogant' },
      { voiceId: 'Standalone', language: undefined },
    ]);
  });

  it('does not extract language for user voices (clone/design), regardless of voice_id underscore prefix', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      system_voice: {
        english: { voice_id: 'English_Friendly_Guy', name: 'Friendly Guy' },
      },
      voice_cloning: [
        { voice_id: 'my_clone_voice', name: 'My Clone' },
        { voice_id: 'voice_abc123', name: 'Auto Cloned' },
      ],
      voice_generation: [
        { voice_id: 'designed_xyz', name: 'Designed Voice' },
        { voice_id: 'simple', name: 'Simple' },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

    const voices = await new MiniMaxSpeechClient().getVoices();
    expect(voices).toHaveLength(5);

    // System voice still gets its language prefix
    expect(voices.find((v) => v.voiceId === 'English_Friendly_Guy')?.language).toBe('English');

    // Every user voice gets language=undefined regardless of underscore prefix
    // (so they all land in the "My Voices" group in the dropdown, not in a
    // bogus "voice" / "designed" / "my" group).
    for (const voiceId of ['my_clone_voice', 'voice_abc123', 'designed_xyz', 'simple']) {
      expect(voices.find((v) => v.voiceId === voiceId)?.language).toBeUndefined();
    }

    // Sanity: type tags are correctly applied.
    expect(voices.find((v) => v.voiceId === 'voice_abc123')?.type).toBe('clone');
    expect(voices.find((v) => v.voiceId === 'designed_xyz')?.type).toBe('design');
  });
  it('retries abort timeouts before succeeding', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), { name: 'AbortError' }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { audio: 'abcd', duration: 1 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const client = new MiniMaxSpeechClient();
    const synthesizePromise = client.synthesize({ text: 'hello', voiceId: 'sys_voice_1' });

    await vi.runAllTimersAsync();

    await expect(synthesizePromise).resolves.toMatchObject({ audioHex: 'abcd', duration: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('propagates requested async output format in the MiniMax request payload', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { task_id: 'task_123' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const client = new MiniMaxSpeechClient();

    await expect(client.submitAsync({
      text: 'hello',
      voiceId: 'sys_voice_1',
      format: 'flac',
    })).resolves.toMatchObject({ taskId: 'task_123' });

    const [, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      audio_setting: { format: 'flac' },
      model: 'speech-2.8-hd',
      voice_setting: { voice_id: 'sys_voice_1' },
    });
  });

  it('reports and aborts when the upstream stream stalls', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn().mockResolvedValue(new Response(new ReadableStream({
      start() {
        // Intentionally never emits chunks.
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })) as typeof fetch;

    const client = new MiniMaxSpeechClient();
    const stream = await client.stream('hello', 'sys_voice_1');
    const reader = stream.getReader();
    const readResult = reader.read().then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error })
    );

    await vi.advanceTimersByTimeAsync(15_000);

    const result = await readResult;

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected stalled stream read to fail.');
    }

    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('Streaming stalled while reading MiniMax response');
    expect(report).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'stream_stall',
      endpoint: '/api/minimax/tts/stream',
      statusCode: 504,
      redacted: true,
    }));
  });

  it('retries plain-text 429 responses once and emits upstream_retry telemetry', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('Rate limited upstream', {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'retry-after': '0', 'Content-Type': 'text/plain' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { audio: 'abcd', duration: 1 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const client = new MiniMaxSpeechClient();
    const synthesizePromise = client.synthesize({ text: 'hello', voiceId: 'sys_voice_1', format: 'wav' });

    await vi.runAllTimersAsync();

    await expect(synthesizePromise).resolves.toMatchObject({ audioHex: 'abcd', format: 'wav' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'upstream_retry',
      operation: 'speech.synthesize',
      upstreamStatus: 429,
      retryAfterSeconds: 0,
      attemptNumber: 1,
      redacted: true,
    }));
  });

  it('retries malformed 503 responses up to the retry bound without body reuse failures', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{"code":', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    }))) as typeof fetch;

    const client = new MiniMaxSpeechClient();
    const synthesizePromise = client.synthesize({ text: 'hello', voiceId: 'sys_voice_1' });
    const expectation = expect(synthesizePromise).rejects.toMatchObject({
      name: 'MiniMaxSpeechError',
      status: 503,
      code: 503,
      message: 'Service Unavailable',
    });

    await vi.runAllTimersAsync();

    await expectation;
    expect(global.fetch).toHaveBeenCalledTimes(4);
    expect(report).toHaveBeenCalledTimes(3);
    expect(report).toHaveBeenNthCalledWith(3, expect.objectContaining({
      eventType: 'upstream_retry',
      operation: 'speech.synthesize',
      upstreamStatus: 503,
      attemptNumber: 3,
      redacted: true,
    }));
  });

  it('retries HTTP-200 base_resp transient status_code failures before succeeding', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        base_resp: {
          status_code: 503,
          status_msg: 'Service temporarily unavailable',
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { audio: 'beef', duration: 2 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const client = new MiniMaxSpeechClient();
    const synthesizePromise = client.synthesize({ text: 'hello', voiceId: 'sys_voice_1' });

    await vi.runAllTimersAsync();

    await expect(synthesizePromise).resolves.toMatchObject({ audioHex: 'beef', duration: 2 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'upstream_retry',
      operation: 'speech.synthesize',
      upstreamStatus: 503,
      attemptNumber: 1,
      redacted: true,
    }));
  });

  it('does not retry permanent HTTP-200 base_resp clone failures such as 2038', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      base_resp: {
        status_code: 2038,
        status_msg: 'Voice clone verification required',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const client = new MiniMaxSpeechClient();
    const clonePromise = client.cloneVoice('file_123', 'voice_123');

    await expect(clonePromise).rejects.toMatchObject({
      name: 'VoiceCloneNotVerifiedError',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(report).not.toHaveBeenCalled();
  });

  it('retries stream initial fetch failures and emits upstream_retry telemetry', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('upstream unavailable', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' },
      }))
      .mockResolvedValueOnce(new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: hello\n\n'));
          controller.close();
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })) as typeof fetch;

    const client = new MiniMaxSpeechClient();
    const streamPromise = client.stream('hello', 'sys_voice_1');

    await vi.runAllTimersAsync();

    const stream = await streamPromise;
    const reader = stream.getReader();
    await expect(reader.read()).resolves.toMatchObject({ done: false });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'upstream_retry',
      operation: 'speech.stream',
      upstreamStatus: 503,
      attemptNumber: 1,
      redacted: true,
    }));
  });

  it('retries stream HTTP-200 base_resp transient failures before returning SSE', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        base_resp: {
          status_code: 429,
          status_msg: 'Slow down',
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: hello\n\n'));
          controller.close();
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })) as typeof fetch;

    const client = new MiniMaxSpeechClient();
    const streamPromise = client.stream('hello', 'sys_voice_1');

    await vi.runAllTimersAsync();

    const stream = await streamPromise;
    const reader = stream.getReader();
    await expect(reader.read()).resolves.toMatchObject({ done: false });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'upstream_retry',
      operation: 'speech.stream',
      upstreamStatus: 429,
      attemptNumber: 1,
      redacted: true,
    }));
  });

  it('does not retry permanent stream HTTP-200 base_resp errors', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      base_resp: {
        status_code: 4001,
        status_msg: 'Invalid stream request',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const client = new MiniMaxSpeechClient();

    await expect(client.stream('hello', 'sys_voice_1')).rejects.toMatchObject({
      name: 'MiniMaxSpeechError',
      code: 4001,
      status: 200,
      message: 'Invalid stream request',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(report).not.toHaveBeenCalled();
  });

  it('rejects async submit responses with an empty task_id with a 502 error', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { task_id: '' },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const client = new MiniMaxSpeechClient();

    await expect(client.submitAsync({
      text: 'hello',
      voiceId: 'sys_voice_1',
    })).rejects.toMatchObject({
      name: 'MiniMaxSpeechError',
      status: 502,
      code: 0,
      message: 'MiniMax returned an empty task ID',
    });
  });

  it('rejects async submit responses whose task_id is whitespace-only', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { task_id: '   ' },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const client = new MiniMaxSpeechClient();

    await expect(client.submitAsync({
      text: 'hello',
      voiceId: 'sys_voice_1',
    })).rejects.toMatchObject({
      name: 'MiniMaxSpeechError',
      status: 502,
      message: 'MiniMax returned an empty task ID',
    });
  });

  it('rejects design responses with an empty voice_id with a 502 error', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      voice_id: '',
      trial_audio: '',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const client = new MiniMaxSpeechClient();

    await expect(client.designVoice('a prompt', 'a preview')).rejects.toMatchObject({
      name: 'MiniMaxSpeechError',
      status: 502,
      code: 0,
      message: 'MiniMax returned an empty designed voice ID',
    });
  });

  it('rejects design responses whose voice_id is whitespace-only', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      voice_id: '   ',
      trial_audio: '',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const client = new MiniMaxSpeechClient();

    await expect(client.designVoice('a prompt', 'a preview')).rejects.toMatchObject({
      name: 'MiniMaxSpeechError',
      status: 502,
      message: 'MiniMax returned an empty designed voice ID',
    });
  });
});
