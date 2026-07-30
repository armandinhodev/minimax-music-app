'use client';

const DB_NAME = 'minimax_generated_audio';
const DB_VERSION = 1;
const STORE_NAME = 'audio_blobs';

export interface StoredAudio {
  key: string;
  blob: Blob;
  format: string;
  createdAt: number;
}

function getIndexedDB(): IDBFactory {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this browser.');
  }
  return indexedDB;
}

function normalizeFormat(format: string | undefined): string {
  const normalized = (format || 'mp3').toLowerCase().replace(/^\./, '');
  return /^[a-z0-9]+$/.test(normalized) ? normalized : 'mp3';
}

function getMimeType(format: string): string {
  if (format === 'mp3') return 'audio/mpeg';
  return `audio/${format}`;
}

function generateStorageKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `tts-${crypto.randomUUID()}`;
  }
  return `tts-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '');
  if (clean.length % 2 !== 0 || /[^\da-f]/i.test(clean)) {
    throw new Error('Invalid hex audio data.');
  }

  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

function openAudioDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = getIndexedDB().open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open audio storage.'));
    request.onblocked = () => reject(new Error('Audio storage is blocked by another tab.'));
  });
}

export async function storeAudioFromHex(hex: string, format?: string): Promise<string> {
  const audioFormat = normalizeFormat(format);
  const key = generateStorageKey();
  const audioBytes = hexToUint8Array(hex);
  const blob = new Blob([audioBytes.buffer as ArrayBuffer], { type: getMimeType(audioFormat) });
  const record: StoredAudio = { key, blob, format: audioFormat, createdAt: Date.now() };
  const db = await openAudioDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onerror = () => reject(request.error ?? new Error('Failed to store generated audio.'));
    transaction.oncomplete = () => {
      db.close();
      resolve(key);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Failed to store generated audio.'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error('Audio storage transaction was aborted.'));
    };
  });
}

export async function getStoredAudio(key: string): Promise<StoredAudio | null> {
  const db = await openAudioDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve((request.result as StoredAudio | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Failed to read generated audio.'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Failed to read generated audio.'));
    };
  });
}

export async function deleteStoredAudio(key: string): Promise<void> {
  const db = await openAudioDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onerror = () => reject(request.error ?? new Error('Failed to delete generated audio.'));
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Failed to delete generated audio.'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error('Audio storage delete transaction was aborted.'));
    };
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
