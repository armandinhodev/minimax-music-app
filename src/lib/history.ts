/**
 * history.ts — localStorage utilities for non-secret task metadata.
 * Stores metadata only: { id, type, source?, voiceId?, text?, lyrics?, fileId?, taskId?, audioUrl?, audioStorageKey?, imageUrls?, format?, aspectRatio?, seed?, model?, promptOptimizer?, instrumental?, durationSeconds?, sampleRate?, bitrate?, createdAt, ttlExpiry? }
 * NEVER stores secrets (API keys, tokens, etc.)
 */

export type HistoryType = 'tts' | 'clone' | 'design' | 'image' | 'music';
export type HistorySource = 'text-to-speech' | 'text-to-image' | 'image-to-image' | 'text-to-music' | 'instrumental-music';

export interface HistoryItem {
  id: string;
  type: HistoryType;
  source?: HistorySource;
  voiceId?: string;
  text?: string;
  lyrics?: string;
  fileId?: string;
  taskId?: string;
  audioUrl?: string;
  audioStorageKey?: string;
  imageUrls?: string[];
  format?: string;
  aspectRatio?: string;
  seed?: number;
  model?: string;
  promptOptimizer?: boolean;
  instrumental?: boolean;
  durationSeconds?: number;
  sampleRate?: number;
  bitrate?: number;
  createdAt: number; // Unix timestamp ms
  ttlExpiry?: number; // Unix timestamp ms — for voices and download URLs
  serverSynced?: boolean; // true when the item came from the server-side SQLite metadata store
}

const STORAGE_KEY = 'minimax_speech_history';

/**
 * Generate a short unique ID (UUID v4-like).
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Read all history items from localStorage.
 * Returns empty array if localStorage is unavailable or parsing fails.
 */
export function getHistoryItems(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Save a new history item to localStorage.
 * Stores the item with a generated UUID and current timestamp.
 * Returns the saved item with its id.
 */
export function saveHistoryItem(
  item: Omit<HistoryItem, 'id' | 'createdAt'>
): HistoryItem {
  const newItem: HistoryItem = {
    id: generateId(),
    type: item.type,
    createdAt: Date.now(),
  };

  if (item.voiceId !== undefined) newItem.voiceId = item.voiceId;
  if (item.source !== undefined) newItem.source = item.source;
  if (item.text !== undefined) newItem.text = item.text;
  if (item.lyrics !== undefined) newItem.lyrics = item.lyrics;
  if (item.fileId !== undefined) newItem.fileId = item.fileId;
  if (item.taskId !== undefined) newItem.taskId = item.taskId;
  if (item.audioUrl !== undefined) newItem.audioUrl = item.audioUrl;
  if (item.audioStorageKey !== undefined) newItem.audioStorageKey = item.audioStorageKey;
  if (item.imageUrls !== undefined) newItem.imageUrls = item.imageUrls;
  if (item.format !== undefined) newItem.format = item.format;
  if (item.aspectRatio !== undefined) newItem.aspectRatio = item.aspectRatio;
  if (item.seed !== undefined) newItem.seed = item.seed;
  if (item.model !== undefined) newItem.model = item.model;
  if (item.promptOptimizer !== undefined) newItem.promptOptimizer = item.promptOptimizer;
  if (item.instrumental !== undefined) newItem.instrumental = item.instrumental;
  if (item.durationSeconds !== undefined) newItem.durationSeconds = item.durationSeconds;
  if (item.sampleRate !== undefined) newItem.sampleRate = item.sampleRate;
  if (item.bitrate !== undefined) newItem.bitrate = item.bitrate;
  if (item.ttlExpiry !== undefined) newItem.ttlExpiry = item.ttlExpiry;
  if (item.serverSynced !== undefined) newItem.serverSynced = item.serverSynced;

  const items = getHistoryItems();
  items.unshift(newItem); // Most recent first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

  return newItem;
}

/**
 * Remove a history item by id.
 */
export function removeHistoryItem(id: string): void {
  const items = getHistoryItems().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Update a history item's ttlExpiry by id.
 */
export function updateHistoryItemTtl(id: string, ttlExpiry: number): void {
  const items = getHistoryItems().map((item) =>
    item.id === id ? { ...item, ttlExpiry } : item
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Clear all history items.
 */
export function clearHistory(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Get a single history item by id.
 */
export function getHistoryItem(id: string): HistoryItem | null {
  const items = getHistoryItems();
  return items.find((item) => item.id === id) ?? null;
}
