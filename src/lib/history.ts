/**
 * history.ts — localStorage utilities for non-secret task metadata.
 * Stores: { id, type, voiceId?, text?, fileId?, taskId?, audioUrl?, createdAt, ttlExpiry? }
 * NEVER stores secrets (API keys, tokens, etc.)
 */

export type HistoryType = 'tts' | 'clone' | 'design';

export interface HistoryItem {
  id: string;
  type: HistoryType;
  voiceId?: string;
  text?: string;
  fileId?: string;
  taskId?: string;
  audioUrl?: string;
  createdAt: number; // Unix timestamp ms
  ttlExpiry?: number; // Unix timestamp ms — for voices and download URLs
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
    ...item,
    id: generateId(),
    createdAt: Date.now(),
  };

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
