/** @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MiniMaxImageClient } from './MiniMaxImageClient';
import { setTelemetryReporterForTests } from '@/lib/telemetry';

vi.mock('server-only', () => ({}));

describe('MiniMaxImageClient', () => {
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

  it('sends MiniMax image_generation payload using URL response format', async () => {
    vi.setSystemTime(new Date('2026-07-29T12:00:00Z'));
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'generation-1',
      data: { image_urls: ['https://example.com/image.png'] },
      metadata: { success_count: 1, failed_count: 0 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const result = await new MiniMaxImageClient().generateImage({
      model: 'image-01',
      prompt: 'A cinematic product photo.',
      aspectRatio: '16:9',
      responseFormat: 'url',
      n: 2,
      seed: 42,
      promptOptimizer: true,
    });

    expect(result).toEqual({
      id: 'generation-1',
      imageUrls: ['https://example.com/image.png'],
      metadata: { successCount: 1, failedCount: 0 },
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.minimax.io/v1/image_generation');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-minimax-key',
    });
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'image-01',
      prompt: 'A cinematic product photo.',
      aspect_ratio: '16:9',
      response_format: 'url',
      seed: 42,
      n: 2,
      prompt_optimizer: true,
    });
  });

  it('maps image-to-image subject references to MiniMax subject_reference payload', async () => {
    const referenceImageDataUrl = `data:image/jpeg;base64,${Buffer.from('portrait').toString('base64')}`;
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'generation-i2i',
      data: { image_urls: ['https://example.com/image.png'] },
      metadata: { success_count: 1, failed_count: 0 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    await new MiniMaxImageClient().generateImage({
      model: 'image-01',
      prompt: 'Create an editorial portrait.',
      aspectRatio: '3:4',
      responseFormat: 'url',
      subjectReference: [{ type: 'character', imageFile: referenceImageDataUrl }],
      n: 1,
      promptOptimizer: false,
    });

    const [, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'image-01',
      prompt: 'Create an editorial portrait.',
      aspect_ratio: '3:4',
      response_format: 'url',
      subject_reference: [{ type: 'character', image_file: referenceImageDataUrl }],
      n: 1,
      prompt_optimizer: false,
    });
  });


  it('does not retry transient generation failures to avoid duplicate image jobs', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });
    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        base_resp: { status_code: 429, status_msg: 'Slow down' },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'generation-2',
        data: { image_urls: ['https://example.com/image.png'] },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    await expect(new MiniMaxImageClient().generateImage({
      model: 'image-01',
      prompt: 'A cinematic product photo.',
      aspectRatio: '1:1',
      responseFormat: 'url',
      n: 1,
      promptOptimizer: false,
    })).rejects.toMatchObject({ status: 429, code: 429 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(report).not.toHaveBeenCalled();
  });

  it('rejects empty image URL responses with a 502-like client error', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'generation-empty',
      data: { image_urls: [] },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    await expect(new MiniMaxImageClient().generateImage({
      model: 'image-01',
      prompt: 'A cinematic product photo.',
      aspectRatio: '1:1',
      responseFormat: 'url',
      n: 1,
      promptOptimizer: false,
    })).rejects.toMatchObject({
      name: 'MiniMaxImageError',
      status: 502,
      message: 'MiniMax returned no image URLs',
    });
  });
});
