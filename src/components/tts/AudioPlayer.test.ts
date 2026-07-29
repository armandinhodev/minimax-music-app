/**
 * AudioPlayer unit tests — hex string → ArrayBuffer/Uint8Array conversion.
 * Tests the hexToArrayBuffer and hexToUint8Array utilities exported from AudioPlayer.
 */

import { describe, it, expect } from 'vitest';
import { hexToArrayBuffer, hexToUint8Array } from '@/components/tts/AudioPlayer';

describe('hexToArrayBuffer', () => {
  it('converts empty hex string to empty ArrayBuffer', () => {
    const result = hexToArrayBuffer('');
    expect(result.byteLength).toBe(0);
  });

  it('converts valid hex string to correct byte array', () => {
    // "A1B2C3D4" = bytes [0xA1, 0xB2, 0xC3, 0xD4]
    const result = hexToArrayBuffer('A1B2C3D4');
    const bytes = new Uint8Array(result);
    expect(bytes).toEqual(new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4]));
  });

  it('handles hex string with spaces', () => {
    const result = hexToArrayBuffer('A1 B2 C3 D4');
    const bytes = new Uint8Array(result);
    expect(bytes).toEqual(new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4]));
  });

  it('handles single byte hex string', () => {
    const result = hexToArrayBuffer('FF');
    const bytes = new Uint8Array(result);
    expect(bytes).toEqual(new Uint8Array([0xff]));
  });

  it('handles lowercase hex characters', () => {
    const result = hexToArrayBuffer('a1b2c3d4');
    const bytes = new Uint8Array(result);
    expect(bytes).toEqual(new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4]));
  });

  it('handles mixed case hex characters', () => {
    const result = hexToArrayBuffer('A1b2C3d4');
    const bytes = new Uint8Array(result);
    expect(bytes).toEqual(new Uint8Array([0xa1, 0xb2, 0xc3, 0xd4]));
  });

  it('handles large hex string', () => {
    const hex = '00'.repeat(1000);
    const result = hexToArrayBuffer(hex);
    expect(result.byteLength).toBe(1000);
  });

  it('produces zero bytes for invalid hex characters', () => {
    // Invalid hex chars like 'ZZ' will produce NaN from parseInt
    // NaN assigned to Uint8Array slot becomes 0 (Number(NaN) → 0)
    const result = hexToArrayBuffer('ZZ');
    const bytes = new Uint8Array(result);
    // 'ZZ' has 2 chars → 1 byte. parseInt('ZZ',16) = NaN → stored as 0
    expect(bytes.length).toBe(1);
    expect(bytes[0]).toBe(0);
  });
});

describe('hexToUint8Array', () => {
  it('converts empty hex string to empty Uint8Array', () => {
    const result = hexToUint8Array('');
    expect(result.length).toBe(0);
  });

  it('converts valid hex to correct Uint8Array', () => {
    const result = hexToUint8Array('48656C6C6F'); // "Hello" in ASCII hex
    expect(result).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    // Verify the bytes represent "Hello"
    const text = new TextDecoder().decode(result);
    expect(text).toBe('Hello');
  });

  it('converts hex string with spaces', () => {
    const result = hexToUint8Array('48 65 6c 6c 6f');
    expect(result).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
  });

  it('handles lowercase hex characters', () => {
    const result = hexToUint8Array('68656c6c6f'); // "hello"
    expect(result).toEqual(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]));
  });

  it('roundtrips through hex correctly', () => {
    const original = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21]); // "Hello!"
    const hex = Array.from(original)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const result = hexToUint8Array(hex);
    expect(result).toEqual(original);
  });

  it('handles real audio hex sample (partial WAV header)', () => {
    // WAV header starting with "RIFF" = 0x52 0x49 0x46 0x46
    const result = hexToUint8Array('52494646');
    expect(result[0]).toBe(0x52); // 'R'
    expect(result[1]).toBe(0x49); // 'I'
    expect(result[2]).toBe(0x46); // 'F'
    expect(result[3]).toBe(0x46); // 'F'
  });
});

describe('hexToArrayBuffer vs hexToUint8Array parity', () => {
  it('produce the same byte content', () => {
    const hex = 'A1B2C3D4E5F6071928374655';
    const abResult = new Uint8Array(hexToArrayBuffer(hex));
    const u8Result = hexToUint8Array(hex);
    expect(abResult).toEqual(u8Result);
  });

  it('both return ArrayBuffer / Uint8Array respectively', () => {
    const hex = 'A1B2';
    expect(hexToArrayBuffer(hex)).toBeInstanceOf(ArrayBuffer);
    expect(hexToUint8Array(hex)).toBeInstanceOf(Uint8Array);
  });
});
