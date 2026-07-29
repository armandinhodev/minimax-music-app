/** @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MiniMaxFileClient } from './MiniMaxFileClient';
import { setTelemetryReporterForTests } from '@/lib/telemetry';

vi.mock('server-only', () => ({}));

describe('MiniMaxFileClient.uploadFile', () => {
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

  it('retries abort timeouts before succeeding', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), { name: 'AbortError' }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          file_id: 'file_123',
          file_name: 'sample.wav',
          file_size: 4,
          created_at: 123,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const client = new MiniMaxFileClient();
    const uploadPromise = client.uploadFile(Buffer.from([1, 2, 3, 4]), 'sample.wav', 'voice_clone');

    await vi.runAllTimersAsync();

    await expect(uploadPromise).resolves.toMatchObject({ fileId: 'file_123' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('retries bounded upload failures and succeeds after a 429', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 42901, message: 'Rate limited' }), {
        status: 429,
        headers: { 'retry-after': '0', 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          file_id: 'file_123',
          file_name: 'sample.wav',
          file_size: 4,
          created_at: 123,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const client = new MiniMaxFileClient();
    const uploadPromise = client.uploadFile(Buffer.from([1, 2, 3, 4]), 'sample.wav', 'voice_clone');

    await vi.runAllTimersAsync();

    await expect(uploadPromise).resolves.toEqual({
      fileId: 'file_123',
      fileName: 'sample.wav',
      purpose: 'voice_clone',
      size: 4,
      createdAt: 123,
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('retries malformed 429 upload responses safely and emits upstream_retry telemetry', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('{"code":', {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'retry-after': '1', 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          file_id: 'file_123',
          file_name: 'sample.wav',
          file_size: 4,
          created_at: 123,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const client = new MiniMaxFileClient();
    const uploadPromise = client.uploadFile(Buffer.from([1, 2, 3, 4]), 'sample.wav', 'voice_clone');

    await vi.runAllTimersAsync();

    await expect(uploadPromise).resolves.toMatchObject({ fileId: 'file_123' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'upstream_retry',
      operation: 'file.upload',
      upstreamStatus: 429,
      retryAfterSeconds: 1,
      attemptNumber: 1,
      redacted: true,
    }));
  });

  it('retries plain-text 503 list failures up to the retry bound', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('upstream unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    }))) as typeof fetch;

    const client = new MiniMaxFileClient();
    const listPromise = client.listFiles();
    const expectation = expect(listPromise).rejects.toMatchObject({
      name: 'MiniMaxFileError',
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
      operation: 'file.list',
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
          status_code: 429,
          status_msg: 'Slow down',
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        files: [{
          file_id: 'file_123',
          file_name: 'sample.wav',
          purpose: 'voice_clone',
          file_size: 4,
          created_at: 123,
        }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    const client = new MiniMaxFileClient();
    const listPromise = client.listFiles();

    await vi.runAllTimersAsync();

    await expect(listPromise).resolves.toEqual([{
      fileId: 'file_123',
      fileName: 'sample.wav',
      purpose: 'voice_clone',
      size: 4,
      createdAt: 123,
    }]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'upstream_retry',
      operation: 'file.list',
      upstreamStatus: 429,
      attemptNumber: 1,
      redacted: true,
    }));
  });

  it('does not retry permanent HTTP-200 base_resp file failures', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      base_resp: {
        status_code: 4001,
        status_msg: 'Invalid purpose',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const client = new MiniMaxFileClient();
    const listPromise = client.listFiles();

    await expect(listPromise).rejects.toMatchObject({
      name: 'MiniMaxFileError',
      code: 4001,
      status: 200,
      message: 'Invalid purpose',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(report).not.toHaveBeenCalled();
  });

  it('retries retrieveContent initial failures and emits upstream_retry telemetry', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response('still processing', {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'retry-after': '0', 'Content-Type': 'text/plain' },
      }))
      .mockResolvedValueOnce(new Response(Uint8Array.from([1, 2, 3, 4]), {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      })) as typeof fetch;

    const client = new MiniMaxFileClient();
    const contentPromise = client.retrieveContent('file_123');

    await vi.runAllTimersAsync();

    await expect(contentPromise).resolves.toEqual(Uint8Array.from([1, 2, 3, 4]));
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'upstream_retry',
      operation: 'file.retrieveContent',
      upstreamStatus: 429,
      retryAfterSeconds: 0,
      attemptNumber: 1,
      redacted: true,
    }));
  });

  it('retries retrieveContent HTTP-200 base_resp transient failures before returning bytes', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        base_resp: {
          status_code: 503,
          status_msg: 'Temporarily unavailable',
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(Uint8Array.from([1, 2, 3, 4]), {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream' },
      })) as typeof fetch;

    const client = new MiniMaxFileClient();
    const contentPromise = client.retrieveContent('file_123');

    await vi.runAllTimersAsync();

    await expect(contentPromise).resolves.toEqual(Uint8Array.from([1, 2, 3, 4]));
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'upstream_retry',
      operation: 'file.retrieveContent',
      upstreamStatus: 503,
      attemptNumber: 1,
      redacted: true,
    }));
  });

  it('does not retry permanent retrieveContent HTTP-200 base_resp errors', async () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      base_resp: {
        status_code: 4001,
        status_msg: 'Invalid file id',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const client = new MiniMaxFileClient();

    await expect(client.retrieveContent('file_123')).rejects.toMatchObject({
      name: 'MiniMaxFileError',
      code: 4001,
      status: 200,
      message: 'Invalid file id',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(report).not.toHaveBeenCalled();
  });

  it('rejects upload responses with an empty file_id with a 502 error', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        file_id: '',
        file_name: 'sample.wav',
        file_size: 4,
        created_at: 123,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const client = new MiniMaxFileClient();
    const uploadPromise = client.uploadFile(Buffer.from([1, 2, 3, 4]), 'sample.wav', 'voice_clone');
    const expectation = expect(uploadPromise).rejects.toMatchObject({
      name: 'MiniMaxFileError',
      status: 502,
      code: 0,
      message: 'MiniMax returned an empty file ID',
    });

    await vi.runAllTimersAsync();

    await expectation;
  });

  it('rejects upload responses whose file_id is whitespace-only', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        file_id: '   ',
        file_name: 'sample.wav',
        file_size: 4,
        created_at: 123,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

    const client = new MiniMaxFileClient();
    const uploadPromise = client.uploadFile(Buffer.from([1, 2, 3, 4]), 'sample.wav', 'voice_clone');
    const expectation = expect(uploadPromise).rejects.toMatchObject({
      name: 'MiniMaxFileError',
      status: 502,
      message: 'MiniMax returned an empty file ID',
    });

    await vi.runAllTimersAsync();

    await expectation;
  });

  it('rejects retrieve responses with an empty download_url with a 502 error', async () => {
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      file: {
        file_id: 'file_123',
        file_name: 'sample.wav',
        purpose: 'voice_clone',
        file_size: 4,
        created_at: 123,
        download_url: '',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))) as typeof fetch;

    const client = new MiniMaxFileClient();
    const getPromise = client.getFile('file_123');
    const expectation = expect(getPromise).rejects.toMatchObject({
      name: 'MiniMaxFileError',
      status: 502,
      code: 0,
      message: 'MiniMax returned an empty download URL',
    });

    await vi.runAllTimersAsync();

    await expectation;
  });

  it('rejects retrieve responses whose download_url is whitespace-only', async () => {
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      file: {
        file_id: 'file_123',
        file_name: 'sample.wav',
        purpose: 'voice_clone',
        file_size: 4,
        created_at: 123,
        download_url: '   ',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))) as typeof fetch;

    const client = new MiniMaxFileClient();
    const getPromise = client.getFile('file_123');
    const expectation = expect(getPromise).rejects.toMatchObject({
      name: 'MiniMaxFileError',
      status: 502,
      message: 'MiniMax returned an empty download URL',
    });

    await vi.runAllTimersAsync();

    await expectation;
  });
});
