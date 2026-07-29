import { describe, it, expect } from 'vitest';
import {
  NonRetryableStreamError,
  base64ToUint8Array,
  parseStreamingAudioPayload,
  shouldFailCompletedStream,
  shouldRetryStreamFailure,
} from './StreamingPlayer';

describe('base64ToUint8Array', () => {
  it('decodes a complete base64 chunk', () => {
    expect(Array.from(base64ToUint8Array('AAEC/w=='))).toEqual([0, 1, 2, 255]);
  });
});

describe('parseStreamingAudioPayload', () => {
  it('parses valid base64 audio payloads into bytes', () => {
    const result = parseStreamingAudioPayload('{"audio":"SGVsbG8="}');

    expect(result.kind).toBe('audio');
    if (result.kind === 'audio') {
      expect(Array.from(result.bytes)).toEqual([72, 101, 108, 108, 111]);
    }
  });

  it('ignores done markers and empty payloads', () => {
    expect(parseStreamingAudioPayload('[DONE]')).toEqual({ kind: 'ignore' });
    expect(parseStreamingAudioPayload('   ')).toEqual({ kind: 'ignore' });
  });

  it('flags malformed payloads as errors', () => {
    expect(parseStreamingAudioPayload('not-json')).toEqual({
      kind: 'error',
      reason: 'Invalid streaming audio payload.',
    });
  });
});

describe('shouldFailCompletedStream', () => {
  it('fails completed streams when no playable audio was decoded', () => {
    expect(shouldFailCompletedStream(false, false)).toBe(true);
  });

  it('fails completed streams when corrupt chunks were detected', () => {
    expect(shouldFailCompletedStream(true, true)).toBe(true);
  });

  it('allows completion when valid audio played without fatal chunk errors', () => {
    expect(shouldFailCompletedStream(false, true)).toBe(false);
  });

  it('treats repeated corrupt 200-stream decode failures as non-retryable', () => {
    expect(shouldRetryStreamFailure(new NonRetryableStreamError('Streaming audio payload could not be decoded.'))).toBe(false);
  });
});
