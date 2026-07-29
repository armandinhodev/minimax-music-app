/** @vitest-environment node */

/**
 * Telemetry unit tests — getUserSafeMessage and captureServerError behavior.
 */

import { afterEach, describe, it, expect, vi } from 'vitest';
import { getUserSafeMessage, captureServerError, recordUploadFailure, setTelemetryReporterForTests, type TelemetryEvent } from './telemetry';
import { VoiceCloneNotVerifiedError } from '@/application/errors/VoiceCloneNotVerifiedError';

// Mock server-only to prevent import failures in test env
vi.mock('server-only', () => ({}));

describe('getUserSafeMessage', () => {
  it('returns exact 2038 message for VoiceCloneNotVerifiedError', () => {
    const error = new VoiceCloneNotVerifiedError();
    const result = getUserSafeMessage(error);
    expect(result.userMessage).toBe('Voice cloning requires account verification.');
    expect(result.code).toBe(2038);
    expect(result.httpStatus).toBe(403);
  });

  it('returns exact 2038 message when miniMaxCode is 2038', () => {
    const result = getUserSafeMessage(new Error('some error'), 2038);
    expect(result.userMessage).toBe('Voice cloning requires account verification.');
    expect(result.code).toBe(2038);
    expect(result.httpStatus).toBe(403);
  });

  it('returns generic user-safe message for arbitrary errors', () => {
    const error = new Error('MiniMax API internal error details');
    const result = getUserSafeMessage(error);
    expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
    expect(result.code).toBeUndefined();
    expect(result.httpStatus).toBe(500);
  });

  it('returns generic user-safe message for non-Error values', () => {
    expect(getUserSafeMessage('string error')).toEqual({
      userMessage: 'An unexpected error occurred. Please try again.',
      code: undefined,
      httpStatus: 500,
    });
    expect(getUserSafeMessage(null)).toEqual({
      userMessage: 'An unexpected error occurred. Please try again.',
      code: undefined,
      httpStatus: 500,
    });
    expect(getUserSafeMessage(undefined)).toEqual({
      userMessage: 'An unexpected error occurred. Please try again.',
      code: undefined,
      httpStatus: 500,
    });
  });

  it('returns retry metadata for MiniMax 429 errors', () => {
    const error = Object.assign(new Error('rate limited'), {
      code: 42901,
      status: 429,
      retryAfterSeconds: 7,
    });

    expect(getUserSafeMessage(error)).toEqual({
      userMessage: 'MiniMax is rate limiting requests. Please retry shortly.',
      code: 42901,
      httpStatus: 429,
      retryable: true,
      retryAfterSeconds: 7,
    });
  });

  it('returns retry metadata for MiniMax 5xx errors', () => {
    const error = Object.assign(new Error('upstream failure'), {
      code: 50042,
      status: 502,
    });

    expect(getUserSafeMessage(error)).toEqual({
      userMessage: 'MiniMax is temporarily unavailable. Please retry shortly.',
      code: 50042,
      httpStatus: 503,
      retryable: true,
      retryAfterSeconds: undefined,
    });
  });
});

describe('captureServerError', () => {
  afterEach(() => {
    setTelemetryReporterForTests(null);
  });

  it('does not throw when called with valid inputs', () => {
    expect(() =>
      captureServerError(new Error('test'), {
        endpoint: '/api/minimax/tts',
        method: 'POST',
        statusCode: 500,
      })
    ).not.toThrow();
  });

  it('sends structured events to a custom reporter', () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    captureServerError(Object.assign(new Error('rate limited'), {
      code: 42901,
      status: 429,
      retryAfterSeconds: 6,
    }), {
      endpoint: '/api/minimax/tts',
      method: 'POST',
      statusCode: 429,
      miniMaxMessage: 'Rate limited',
      kind: 'route_error',
      operation: 'sync-tts',
    });

    expect(report).toHaveBeenCalledTimes(1);
    const event = report.mock.calls[0][0] as TelemetryEvent;

    expect(event).toMatchObject({
      service: 'minimax-api',
      eventType: 'route_error',
      endpoint: '/api/minimax/tts',
      method: 'POST',
      operation: 'sync-tts',
      statusCode: 429,
      miniMaxCode: 42901,
      upstreamStatus: 429,
      retryAfterSeconds: 6,
      retryable: true,
      redacted: true,
    });
  });

  it('redacts bearer tokens and secrets before logging', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    captureServerError(new Error('Bearer super-secret-token failed'), {
      endpoint: '/api/minimax/tts',
      method: 'POST',
      statusCode: 500,
      miniMaxMessage: 'authorization=abc123',
      stack: 'Error: api_key=shhh',
    });

    const payload = JSON.parse(consoleSpy.mock.calls[0][0] as string) as Record<string, unknown>;

    expect(payload.errorMessage).toBe('Bearer [REDACTED] failed');
    expect(payload.miniMaxMessage).toBe('authorization=[REDACTED]');
    expect(payload.stack).toBe('Error: api_key=[REDACTED]');
    expect(payload.redacted).toBe(true);

    consoleSpy.mockRestore();
  });

  it('always populates miniMaxMessage / upstreamStatus / retryAfterSeconds (null when unknown)', () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    captureServerError(new Error('totally unknown failure'), {
      endpoint: '/api/minimax/tts',
      method: 'POST',
      statusCode: 500,
    });

    const event = report.mock.calls[0][0] as TelemetryEvent;
    expect(Object.prototype.hasOwnProperty.call(event, 'miniMaxMessage')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(event, 'upstreamStatus')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(event, 'retryAfterSeconds')).toBe(true);
    expect(event.miniMaxMessage).toBeNull();
    expect(event.upstreamStatus).toBeNull();
    expect(event.retryAfterSeconds).toBeNull();
  });
});

describe('recordUploadFailure', () => {
  afterEach(() => {
    setTelemetryReporterForTests(null);
  });

  it('emits an upload_failure event with the upload endpoint and operation', () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    recordUploadFailure(new Error('upload exploded'), {
      endpoint: '/api/minimax/files/upload',
      method: 'POST',
      statusCode: 500,
      operation: 'file.upload',
    });

    expect(report).toHaveBeenCalledTimes(1);
    const event = report.mock.calls[0][0] as TelemetryEvent;
    expect(event).toMatchObject({
      eventType: 'upload_failure',
      endpoint: '/api/minimax/files/upload',
      method: 'POST',
      operation: 'file.upload',
      statusCode: 500,
      miniMaxMessage: null,
      upstreamStatus: null,
      retryAfterSeconds: null,
      redacted: true,
    });
  });

  it('defaults the operation to file.upload when none is supplied', () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    recordUploadFailure(new Error('boom'), {
      endpoint: '/api/minimax/files/upload',
      method: 'POST',
      statusCode: 500,
    });

    const event = report.mock.calls[0][0] as TelemetryEvent;
    expect(event.operation).toBe('file.upload');
  });

  it('forwards MiniMax code and message to the emitted event', () => {
    const report = vi.fn();
    setTelemetryReporterForTests({ report });

    recordUploadFailure(Object.assign(new Error('upstream rejected'), {
      code: 4001,
      status: 400,
    }), {
      endpoint: '/api/minimax/files/upload',
      method: 'POST',
      statusCode: 500,
      miniMaxCode: 4001,
      miniMaxMessage: 'Invalid purpose',
    });

    const event = report.mock.calls[0][0] as TelemetryEvent;
    expect(event.eventType).toBe('upload_failure');
    expect(event.miniMaxCode).toBe(4001);
    expect(event.miniMaxMessage).toBe('Invalid purpose');
    expect(event.upstreamStatus).toBe(400);
  });
});
