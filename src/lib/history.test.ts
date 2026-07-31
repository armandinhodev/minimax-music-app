/**
 * history.test.ts — Vitest unit tests for history.ts localStorage utilities.
 * Covers: saveHistoryItem, getHistoryItems, removeHistoryItem,
 * updateHistoryItemTtl, clearHistory, getHistoryItem, and non-secret storage behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getHistoryItems,
  saveHistoryItem,
  removeHistoryItem,
  updateHistoryItemTtl,
  clearHistory,
  getHistoryItem,
} from './history';

const STORAGE_KEY = 'minimax_speech_history';

// Mutable storage for tests
let storageStore: Record<string, string | null> = {};

const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storageStore[key];
  }),
  clear: vi.fn(() => {
    storageStore = {};
  }),
};

vi.stubGlobal('localStorage', mockLocalStorage);

beforeEach(() => {
  vi.clearAllMocks();
  storageStore = {};
});

describe('getHistoryItems', () => {
  it('returns empty array when localStorage is empty', () => {
    const items = getHistoryItems();
    expect(items).toEqual([]);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('returns parsed items when localStorage has data', () => {
    const stored = [
      { id: '1', type: 'tts', text: 'hello', createdAt: 1234567890 },
    ];
    storageStore[STORAGE_KEY] = JSON.stringify(stored);

    const items = getHistoryItems();
    expect(items).toEqual(stored);
  });

  it('returns empty array when localStorage parse fails', () => {
    storageStore[STORAGE_KEY] = 'not valid json';

    const items = getHistoryItems();
    expect(items).toEqual([]);
  });

  it('does not throw when localStorage getItem throws', () => {
    mockLocalStorage.getItem.mockImplementationOnce(() => {
      throw new Error('localStorage unavailable');
    });

    const items = getHistoryItems();
    expect(items).toEqual([]);
  });

  it('does not store secrets (no MINIMAX_API_KEY in items)', () => {
    const items = getHistoryItems();
    const serialized = JSON.stringify(items);
    expect(serialized).not.toContain('MINIMAX_API_KEY');
    expect(serialized).not.toContain('api_key');
    expect(serialized).not.toContain('secret');
  });
});

describe('saveHistoryItem', () => {
  it('saves a new history item with generated id and timestamp', () => {
    const item = saveHistoryItem({ type: 'tts', text: 'hello world' });

    expect(item.id).toBeDefined();
    expect(item.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(item.type).toBe('tts');
    expect(item.text).toBe('hello world');
    expect(item.createdAt).toBeCloseTo(Date.now(), -3); // within ~1 second
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.any(String)
    );
  });

  it('prepends new items (most recent first)', () => {
    const item1 = saveHistoryItem({ type: 'tts', text: 'first' });
    const item2 = saveHistoryItem({ type: 'clone', voiceId: 'sys_male' });

    const call = mockLocalStorage.setItem.mock.calls[1];
    const saved = JSON.parse(call[1]) as Array<{ id: string }>;
    expect(saved[0].id).toBe(item2.id);
    expect(saved[1].id).toBe(item1.id);
  });

  it('saves item with optional fields', () => {
    const item = saveHistoryItem({
      type: 'clone',
      voiceId: 'my-voice-1',
      text: 'sample text',
      fileId: 'file_abc',
      taskId: 'task_123',
      audioStorageKey: 'audio-key-1',
      imageUrls: ['https://example.com/image.png'],
      lyrics: '[Verse] hello',
      format: 'mp3',
      aspectRatio: '1:1',
      seed: 42,
      model: 'image-01',
      promptOptimizer: true,
      instrumental: false,
      durationSeconds: 118,
      sampleRate: 44100,
      bitrate: 256000,
      ttlExpiry: Date.now() + 9 * 60 * 60 * 1000,
    });

    expect(item.voiceId).toBe('my-voice-1');
    expect(item.fileId).toBe('file_abc');
    expect(item.taskId).toBe('task_123');
    expect(item.audioStorageKey).toBe('audio-key-1');
    expect(item.imageUrls).toEqual(['https://example.com/image.png']);
    expect(item.lyrics).toBe('[Verse] hello');
    expect(item.format).toBe('mp3');
    expect(item.aspectRatio).toBe('1:1');
    expect(item.seed).toBe(42);
    expect(item.model).toBe('image-01');
    expect(item.promptOptimizer).toBe(true);
    expect(item.instrumental).toBe(false);
    expect(item.durationSeconds).toBe(118);
    expect(item.sampleRate).toBe(44100);
    expect(item.bitrate).toBe(256000);
    expect(item.ttlExpiry).toBeDefined();
  });

  it('does not include secret fields', () => {
    const item = saveHistoryItem({ type: 'tts' });
    const serialized = JSON.stringify(item);
    expect(serialized).not.toContain('MINIMAX_API_KEY');
    expect(serialized).not.toContain('apiKey');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('token');
  });
});

describe('removeHistoryItem', () => {
  it('removes an item by id', () => {
    const stored = [
      { id: '1', type: 'tts', createdAt: 123 },
      { id: '2', type: 'clone', createdAt: 456 },
    ];
    storageStore[STORAGE_KEY] = JSON.stringify(stored);

    removeHistoryItem('1');

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify([{ id: '2', type: 'clone', createdAt: 456 }])
    );
  });

  it('writes unchanged list when item not found', () => {
    const stored = [{ id: '1', type: 'tts', createdAt: 123 }];
    storageStore[STORAGE_KEY] = JSON.stringify(stored);

    removeHistoryItem('nonexistent');

    // setItem IS called (implementation always writes)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(stored)
    );
  });
});

describe('updateHistoryItemTtl', () => {
  it('updates ttlExpiry for an existing item', () => {
    const stored = [
      { id: '1', type: 'tts', createdAt: 123 },
      { id: '2', type: 'clone', createdAt: 456 },
    ];
    storageStore[STORAGE_KEY] = JSON.stringify(stored);
    const newTtl = Date.now() + 10 * 60 * 60 * 1000;

    updateHistoryItemTtl('2', newTtl);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify([
        { id: '1', type: 'tts', createdAt: 123 },
        { id: '2', type: 'clone', createdAt: 456, ttlExpiry: newTtl },
      ])
    );
  });

  it('writes unchanged list when item not found', () => {
    const stored = [{ id: '1', type: 'tts', createdAt: 123 }];
    storageStore[STORAGE_KEY] = JSON.stringify(stored);

    updateHistoryItemTtl('nonexistent', Date.now());

    // setItem IS called (implementation always writes)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(stored)
    );
  });
});

describe('clearHistory', () => {
  it('removes the storage key', () => {
    clearHistory();
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});

describe('getHistoryItem', () => {
  it('returns null when no items exist', () => {
    const item = getHistoryItem('any-id');
    expect(item).toBeNull();
  });

  it('returns the matching item by id', () => {
    const stored = [
      { id: '1', type: 'tts', text: 'hello', createdAt: 123 },
      { id: '2', type: 'clone', voiceId: 'sys_male', createdAt: 456 },
    ];
    storageStore[STORAGE_KEY] = JSON.stringify(stored);

    const item = getHistoryItem('2');
    expect(item).toEqual({
      id: '2',
      type: 'clone',
      voiceId: 'sys_male',
      createdAt: 456,
    });
  });

  it('returns null when no item matches', () => {
    const stored = [{ id: '1', type: 'tts', createdAt: 123 }];
    storageStore[STORAGE_KEY] = JSON.stringify(stored);

    const item = getHistoryItem('nonexistent');
    expect(item).toBeNull();
  });
});

describe('non-secret storage contract', () => {
  it('HistoryItem type does not allow API key fields', () => {
    // Verify the type definition — no apiKey, MINIMAX_API_KEY, secret, token fields
    const item = saveHistoryItem({ type: 'design', voiceId: 'test' });
    const asRecord = item as unknown as Record<string, unknown>;
    expect(asRecord).not.toHaveProperty('MINIMAX_API_KEY');
    expect(asRecord).not.toHaveProperty('apiKey');
    expect(asRecord).not.toHaveProperty('secret');
    expect(asRecord).not.toHaveProperty('password');
    expect(asRecord).not.toHaveProperty('token');
  });

  it('stored data does not leak sessionStorage app_access_key references into history', () => {
    saveHistoryItem({ type: 'tts', text: 'test' });
    const setCall = mockLocalStorage.setItem.mock.calls[0];
    const storedValue = setCall[1] as string;
    expect(storedValue).not.toContain('app_access_key');
    expect(storedValue).not.toContain('sessionStorage');
  });

  it('stores only whitelisted metadata fields', () => {
    saveHistoryItem({
      type: 'tts',
      text: 'test',
      audioStorageKey: 'audio-key-1',
      format: 'mp3',
      imageUrls: ['https://example.com/image.png'],
      audio: '00010203',
      hex: '00010203',
      rawAudio: '00010203',
    } as unknown as Parameters<typeof saveHistoryItem>[0]);

    const setCall = mockLocalStorage.setItem.mock.calls[0];
    const storedValue = setCall[1] as string;
    expect(storedValue).toContain('audio-key-1');
    expect(storedValue).toContain('mp3');
    expect(storedValue).toContain('https://example.com/image.png');
    expect(storedValue).not.toContain('"audio"');
    expect(storedValue).not.toContain('"hex"');
    expect(storedValue).not.toContain('"rawAudio"');
    expect(storedValue).not.toContain('00010203');
  });
});

/**
 * Contract test — every documented production call site passes a stable shape.
 * If the HistoryItem input contract changes, this test breaks before the React
 * components ship broken renders. Adding a new field to the production flows?
 * Add the matching branch here.
 */
describe('saveHistoryItem contract for production call sites', () => {
  it('accepts the sync T2A success shape (text + voiceId + audioUrl)', () => {
    const item = saveHistoryItem({
      type: 'tts',
      text: 'hello world',
      voiceId: 'sys_voice_1',
      audioUrl: 'https://example.com/audio.mp3',
      format: 'mp3',
    });
    expect(item.type).toBe('tts');
    expect(item.text).toBe('hello world');
    expect(item.voiceId).toBe('sys_voice_1');
    expect(item.audioUrl).toBe('https://example.com/audio.mp3');
    expect(item.format).toBe('mp3');
    expect(item.fileId).toBeUndefined();
    expect(item.ttlExpiry).toBeUndefined();
  });

  it('accepts the sync T2A local audio storage shape (text + voiceId + audioStorageKey)', () => {
    const item = saveHistoryItem({
      type: 'tts',
      text: 'hello world',
      voiceId: 'sys_voice_1',
      audioStorageKey: 'audio-key-1',
      format: 'mp3',
    });

    expect(item.type).toBe('tts');
    expect(item.text).toBe('hello world');
    expect(item.voiceId).toBe('sys_voice_1');
    expect(item.audioStorageKey).toBe('audio-key-1');
    expect(item.format).toBe('mp3');
    expect(item.audioUrl).toBeUndefined();
  });

  it('accepts the stream T2A success shape (text + voiceId only)', () => {
    const item = saveHistoryItem({
      type: 'tts',
      text: 'streamed text',
      voiceId: 'sys_voice_2',
    });
    expect(item.type).toBe('tts');
    expect(item.text).toBe('streamed text');
    expect(item.voiceId).toBe('sys_voice_2');
  });

  it('accepts the clone success shape (voiceId + fileId)', () => {
    const item = saveHistoryItem({
      type: 'clone',
      voiceId: 'my-clone-voice',
      fileId: 'file_abc123',
    });
    expect(item.type).toBe('clone');
    expect(item.voiceId).toBe('my-clone-voice');
    expect(item.fileId).toBe('file_abc123');
  });

  it('accepts the design success shape (voiceId + ttlExpiry)', () => {
    const ttl = Date.now() + 168 * 60 * 60 * 1000;
    const item = saveHistoryItem({
      type: 'design',
      voiceId: 'designed_voice_1',
      ttlExpiry: ttl,
    });
    expect(item.type).toBe('design');
    expect(item.voiceId).toBe('designed_voice_1');
    expect(item.ttlExpiry).toBe(ttl);
  });

  it('accepts the image generation success shape without storing secrets or binary payloads', () => {
    const ttl = Date.now() + 24 * 60 * 60 * 1000;
    const item = saveHistoryItem({
      type: 'image',
      source: 'image-to-image',
      text: 'A premium studio product shot.',
      imageUrls: ['https://example.com/image-1.png', 'https://example.com/image-2.png'],
      aspectRatio: '16:9',
      seed: 123,
      model: 'image-01',
      promptOptimizer: true,
      ttlExpiry: ttl,
    });

    expect(item.type).toBe('image');
    expect(item.source).toBe('image-to-image');
    expect(item.text).toBe('A premium studio product shot.');
    expect(item.imageUrls).toEqual(['https://example.com/image-1.png', 'https://example.com/image-2.png']);
    expect(item.aspectRatio).toBe('16:9');
    expect(item.seed).toBe(123);
    expect(item.model).toBe('image-01');
    expect(item.promptOptimizer).toBe(true);
    expect(item.ttlExpiry).toBe(ttl);
  });

  it('accepts the music generation success shape without storing raw audio hex', () => {
    const item = saveHistoryItem({
      type: 'music',
      source: 'text-to-music',
      text: 'Glossy synth-pop with bright drums.',
      lyrics: '[Chorus]\nRise again',
      audioStorageKey: 'music-audio-key-1',
      format: 'mp3',
      model: 'music-3.0',
      instrumental: false,
      durationSeconds: 116,
      sampleRate: 44100,
      bitrate: 256000,
      audio: '00010203',
      hex: '00010203',
    } as unknown as Parameters<typeof saveHistoryItem>[0]);

    expect(item.type).toBe('music');
    expect(item.source).toBe('text-to-music');
    expect(item.audioStorageKey).toBe('music-audio-key-1');
    expect(item.lyrics).toBe('[Chorus]\nRise again');
    expect(item.durationSeconds).toBe(116);
    const serialized = JSON.stringify(item);
    expect(serialized).not.toContain('"audio"');
    expect(serialized).not.toContain('"hex"');
    expect(serialized).not.toContain('00010203');
  });
});
