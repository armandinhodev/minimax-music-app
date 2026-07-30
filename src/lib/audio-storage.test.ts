import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteStoredAudio, getStoredAudio, storeAudioFromHex } from './audio-storage';

const originalIndexedDB = globalThis.indexedDB;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalIndexedDB) {
    vi.stubGlobal('indexedDB', originalIndexedDB);
  }
});

describe('audio-storage unavailable IndexedDB behavior', () => {
  it('rejects storing audio when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);

    await expect(storeAudioFromHex('00010203', 'mp3')).rejects.toThrow('IndexedDB is not available');
  });

  it('rejects reading audio when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);

    await expect(getStoredAudio('audio-key-1')).rejects.toThrow('IndexedDB is not available');
  });

  it('rejects deleting audio when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);

    await expect(deleteStoredAudio('audio-key-1')).rejects.toThrow('IndexedDB is not available');
  });
});
