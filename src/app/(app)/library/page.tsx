'use client';

/**
 * Library page — local history of generated audio, images, and voices.
 * Reads from localStorage, displays task metadata.
 * Re-fetches download URLs via GET /api/minimax/async/result/[fileId].
 * Shows TTLCounter for expiry.
 *
 * This page does NOT store secrets in localStorage — only task metadata.
 */

import { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authFetch, buildAuthHeader, parseApiError } from '@/lib/auth-client';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { TTLCounter } from '@/components/shared/TTLCounter';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { getHistoryItems, removeHistoryItem, clearHistory, updateHistoryItemTtl } from '@/lib/history';
import type { HistoryItem } from '@/lib/history';
import { deleteStoredAudio, downloadBlob, getStoredAudio } from '@/lib/audio-storage';
import type { LibraryGenerationDTO } from '@/application/dto/LibraryDTO';

type LibraryFilter = 'all' | HistoryItem['type'];

const FILTERS: Array<{ value: LibraryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'tts', label: 'Audio' },
  { value: 'music', label: 'Music' },
  { value: 'image', label: 'Images' },
  { value: 'clone', label: 'Cloned voices' },
  { value: 'design', label: 'Designed voices' },
];

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function getAudioFormat(item: HistoryItem, fallback?: string): string {
  const format = (item.format || fallback || 'mp3').toLowerCase().replace(/^\./, '');
  return /^[a-z0-9]+$/.test(format) ? format : 'mp3';
}

function getAudioFilename(item: HistoryItem, fallbackFormat?: string): string {
  return `${item.type === 'music' ? 'music' : 'tts'}-${item.createdAt}.${getAudioFormat(item, fallbackFormat)}`;
}

function getStringMetadata(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === 'string' ? value : undefined;
}

function getNumberMetadata(metadata: Record<string, unknown>, key: string): number | undefined {
  const value = metadata[key];
  return typeof value === 'number' ? value : undefined;
}

function getBooleanMetadata(metadata: Record<string, unknown>, key: string): boolean | undefined {
  const value = metadata[key];
  return typeof value === 'boolean' ? value : undefined;
}

function getServerGenerationId(item: HistoryItem): string | null {
  return item.id.startsWith('server:') ? item.id.slice('server:'.length) : null;
}

function areLikelySameGeneration(localItem: HistoryItem, serverItem: HistoryItem): boolean {
  const createdCloseEnough = Math.abs(localItem.createdAt - serverItem.createdAt) < 10_000;
  return createdCloseEnough
    && localItem.type === serverItem.type
    && (localItem.text ?? null) === (serverItem.text ?? null)
    && (localItem.model ?? null) === (serverItem.model ?? null);
}

function mergeLibraryItems(localItems: HistoryItem[], serverItems: HistoryItem[]): HistoryItem[] {
  const merged = [...localItems];

  for (const serverItem of serverItems) {
    const alreadyRepresented = merged.some((item) => item.id === serverItem.id || areLikelySameGeneration(item, serverItem));
    if (!alreadyRepresented) merged.push(serverItem);
  }

  return merged.sort((a, b) => b.createdAt - a.createdAt);
}

function mapServerGenerationToHistoryItem(generation: LibraryGenerationDTO): HistoryItem {
  const audioAsset = generation.assets.find((asset) => asset.kind === 'audio');
  const imageAssets = generation.assets.filter((asset) => asset.kind === 'image' && asset.storageType === 'provider_url' && asset.storageRef);
  const imageUrls = imageAssets.map((asset) => asset.storageRef).filter((url): url is string => typeof url === 'string');
  const expiresAt = imageAssets[0]?.expiresAt ?? audioAsset?.expiresAt ?? undefined;

  return {
    id: `server:${generation.id}`,
    type: generation.kind,
    source: generation.source ?? undefined,
    text: generation.prompt ?? undefined,
    lyrics: getStringMetadata(generation.metadata, 'lyrics'),
    fileId: generation.providerFileId ?? undefined,
    audioUrl: audioAsset?.storageType === 'provider_url' ? audioAsset.storageRef ?? undefined : undefined,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    format: audioAsset?.format ?? undefined,
    aspectRatio: getStringMetadata(generation.metadata, 'aspectRatio'),
    seed: getNumberMetadata(generation.metadata, 'seed'),
    model: generation.model ?? undefined,
    promptOptimizer: getBooleanMetadata(generation.metadata, 'promptOptimizer'),
    instrumental: getBooleanMetadata(generation.metadata, 'instrumental'),
    durationSeconds: getNumberMetadata(generation.metadata, 'durationSeconds'),
    sampleRate: getNumberMetadata(generation.metadata, 'sampleRate'),
    bitrate: getNumberMetadata(generation.metadata, 'bitrate'),
    createdAt: generation.createdAt,
    ttlExpiry: expiresAt ?? undefined,
    serverSynced: true,
  };
}

function getImageFilename(item: HistoryItem, index: number): string {
  return `image-${item.createdAt}-${index + 1}.png`;
}

function openUrl(url: string): void {
  window.open(url, '_blank');
}

function downloadImageUrl(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

interface LibraryItemCardProps {
  item: HistoryItem;
  onRefreshUrl: (item: HistoryItem) => Promise<void>;
  onDownload: (item: HistoryItem) => Promise<void> | void;
  onDelete: (item: HistoryItem) => void;
  isRefreshing: boolean;
}

function getItemAccent(type: HistoryItem['type']): 'green' | 'purple' | 'teal' | 'blue' {
  if (type === 'image') return 'blue';
  if (type === 'clone') return 'purple';
  if (type === 'design') return 'teal';
  return 'green';
}

function getItemBadgeVariant(type: HistoryItem['type']): 'success' | 'purple' | 'info' {
  if (type === 'image') return 'info';
  if (type === 'music') return 'purple';
  if (type === 'clone') return 'purple';
  if (type === 'design') return 'info';
  return 'success';
}

function getItemTypeLabel(type: HistoryItem['type']): string {
  if (type === 'image') return 'Generated image';
  if (type === 'music') return 'Generated music';
  if (type === 'clone') return 'Cloned voice';
  if (type === 'design') return 'Designed voice';
  return 'Generated audio';
}

function getImageSourceLabel(source: HistoryItem['source']): string | null {
  if (source === 'image-to-image') return 'Image to Image';
  if (source === 'text-to-image') return 'Text to Image';
  if (source === 'text-to-music') return 'Text to Music';
  if (source === 'instrumental-music') return 'Instrumental Music';
  return null;
}

function getStorageStatus(item: HistoryItem): { label: string; variant: 'success' | 'info' | 'warning' | 'secondary' } {
  if (item.type === 'image') {
    if (item.ttlExpiry && item.ttlExpiry <= Date.now()) return { label: 'URL may be expired', variant: 'warning' };
    if (item.imageUrls?.length) return { label: '24h image URLs', variant: 'info' };
    return { label: 'Image unavailable', variant: 'warning' };
  }
  if (item.serverSynced && !item.audioStorageKey && !item.audioUrl) {
    return { label: 'Metadata only', variant: 'secondary' };
  }
  if (item.type === 'music') {
    if (item.audioStorageKey) return { label: 'Stored locally', variant: 'success' };
    return { label: 'Music unavailable', variant: 'warning' };
  }
  if (item.type !== 'tts') return { label: 'Voice only', variant: 'secondary' };
  if (item.audioStorageKey) return { label: 'Stored locally', variant: 'success' };
  if (item.audioUrl) return { label: 'Temporary URL', variant: 'info' };
  return { label: 'Audio unavailable', variant: 'warning' };
}

function LibraryItemCard({ item, onRefreshUrl, onDownload, onDelete, isRefreshing }: LibraryItemCardProps) {
  const canRefreshUrl = item.type !== 'clone' && Boolean(item.fileId);
  const canDownload = (item.type === 'tts' || item.type === 'music') && Boolean(item.audioUrl || item.audioStorageKey);
  const imageUrls = item.type === 'image' ? item.imageUrls ?? [] : [];
  const storageStatus = getStorageStatus(item);

  return (
    <Card accent={getItemAccent(item.type)}>
      <CardHeader>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <CardTitle style={{ fontSize: '0.875rem' }}>{getItemTypeLabel(item.type)}</CardTitle>
            <CardDescription style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {formatDate(item.createdAt)}
            </CardDescription>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end">
            <Badge variant={getItemBadgeVariant(item.type)}>{item.type}</Badge>
            <Badge variant={storageStatus.variant}>{storageStatus.label}</Badge>
          </Box>
        </Box>
      </CardHeader>
      <CardContent display="grid" gap={2}>
        {item.text && (
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            &ldquo;{truncateText(item.text, 80)}&rdquo;
          </p>
        )}
        {item.voiceId && (
          <p style={{ fontSize: '0.75rem' }}>
            Voice: <code style={{ backgroundColor: '#f3f4f6', padding: '0 0.25rem', borderRadius: '0.25rem' }}>{item.voiceId}</code>
          </p>
        )}
        {item.fileId && (
          <p style={{ fontSize: '0.75rem' }}>
            File: <code style={{ backgroundColor: '#f3f4f6', padding: '0 0.25rem', borderRadius: '0.25rem' }}>{item.fileId}</code>
          </p>
        )}
        {item.type === 'image' && (
          <Box display="flex" gap={2} flexWrap="wrap" color="gray.600" fontSize="0.75rem">
            {getImageSourceLabel(item.source) && <span>Source: {getImageSourceLabel(item.source)}</span>}
            {item.aspectRatio && <span>Ratio: {item.aspectRatio}</span>}
            {item.seed !== undefined && <span>Seed: {item.seed}</span>}
            {item.promptOptimizer !== undefined && <span>Optimizer: {item.promptOptimizer ? 'On' : 'Off'}</span>}
          </Box>
        )}
        {item.type === 'music' && (
          <Box display="flex" gap={2} flexWrap="wrap" color="gray.600" fontSize="0.75rem">
            {getImageSourceLabel(item.source) && <span>Mode: {getImageSourceLabel(item.source)}</span>}
            {item.model && <span>Model: {item.model}</span>}
            {item.format && <span>Format: {item.format.toUpperCase()}</span>}
            {item.durationSeconds !== undefined && <span>Duration: {Math.round(item.durationSeconds)}s</span>}
            {item.sampleRate !== undefined && <span>Sample rate: {item.sampleRate} Hz</span>}
            {item.bitrate !== undefined && <span>Bitrate: {Math.round(item.bitrate / 1000)} kbps</span>}
          </Box>
        )}
        {imageUrls.length > 0 && (
          <Box display="grid" gap={3} gridTemplateColumns="repeat(auto-fit, minmax(8rem, 1fr))" mt={2}>
            {imageUrls.map((url, index) => (
              <Box key={`${url}-${index}`} border="1px solid" borderColor="blue.100" borderRadius="lg" overflow="hidden" bg="gray.50">
                <img
                  src={url}
                  alt={`Generated image ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', aspectRatio: item.aspectRatio ? item.aspectRatio.replace(':', ' / ') : '1 / 1', objectFit: 'cover', display: 'block' }}
                />
                <Box display="flex" gap={1} p="0.5rem" flexWrap="wrap">
                  <Button variant="outline" colorPalette="blue" size="sm" onClick={() => openUrl(url)}>
                    Open
                  </Button>
                  <Button colorPalette="green" size="sm" onClick={() => downloadImageUrl(url, getImageFilename(item, index))}>
                    Download
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}
        {item.type === 'image' && imageUrls.length === 0 && (
          <p style={{ fontSize: '0.75rem', color: '#9a3412' }}>
            No image URL is available for this entry. Generate it again to restore access.
          </p>
        )}
        {(item.type === 'tts' || item.type === 'music') && !canDownload && (
          <p style={{ fontSize: '0.75rem', color: '#9a3412' }}>
            No local audio blob or temporary URL is available for this entry. Generate it again to restore downloads.
          </p>
        )}

        <Box display="flex" alignItems="center" gap={2} mt={2}>
          {item.ttlExpiry && <TTLCounter expiresAt={item.ttlExpiry} label={item.type === 'image' ? 'Image URL TTL' : 'URL TTL'} />}
          {canRefreshUrl && (
            <Button
              variant="outline"
              colorPalette="blue"
              size="sm"
              onClick={() => onRefreshUrl(item)}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh URL'}
            </Button>
          )}
          {canDownload && (
            <Button colorPalette="green" size="sm" onClick={() => onDownload(item)}>
              Download
            </Button>
          )}
          {(item.type === 'tts' || item.type === 'music') && !canDownload && (
            <Button variant="outline" colorPalette="orange" size="sm" disabled>
              Missing audio
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => onDelete(item)}>
            Remove
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function LibraryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<{ code: number | null; message: string | null } | null>(null);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [pendingDeleteItem, setPendingDeleteItem] = useState<HistoryItem | null>(null);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const loadServerHistory = async (localItems: HistoryItem[]) => {
    const authHeader = buildAuthHeader();
    if (!authHeader) return;

    try {
      const response = await fetch('/api/library/generations?limit=50', {
        headers: { Authorization: authHeader },
      });
      if (!response.ok) return;
      const data = await response.json() as { generations?: LibraryGenerationDTO[] };
      const serverItems = (data.generations ?? []).map(mapServerGenerationToHistoryItem);
      setItems(mergeLibraryItems(localItems, serverItems));
    } catch {
      // Browser Library remains usable from local history if server metadata is unavailable.
    }
  };

  const loadHistory = () => {
    const localItems = getHistoryItems();
    setItems(localItems);
    void loadServerHistory(localItems);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRefreshUrl = async (item: HistoryItem) => {
    if (!item.fileId) return;

    setRefreshingIds((prev) => new Set(prev).add(item.id));
    setError(null);
    setActionStatus(null);

    try {
      const response = await authFetch(`/api/minimax/async/result/${item.fileId}`);

      if (!response.ok) {
        const err = await parseApiError(response);
        setError({
          code: err?.code ?? response.status,
          message: err?.message ?? `HTTP ${response.status}`,
        });
        return;
      }

      const data = await response.json();

      // Update item with fresh URL and expiry
      if (data.downloadUrl) {
        updateHistoryItemTtl(item.id, data.expiresAt);
        setItems(getHistoryItems());

        // Open download URL
        window.open(data.downloadUrl, '_blank');
        setActionStatus('Temporary download URL refreshed and opened.');
      }
    } catch {
      setError({ code: null, message: 'Failed to refresh URL.' });
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleDownload = async (item: HistoryItem) => {
    if (item.audioUrl) {
      window.open(item.audioUrl, '_blank');
      setActionStatus('Download opened from the temporary URL.');
      return;
    }

    if (!item.audioStorageKey) {
      setActionStatus(null);
      setError({ code: null, message: 'This Library item has no local audio blob or temporary URL.' });
      return;
    }

    setError(null);
    setActionStatus(null);
    try {
      const storedAudio = await getStoredAudio(item.audioStorageKey);
      if (!storedAudio) {
        setError({ code: null, message: 'Stored audio is unavailable in this browser.' });
        return;
      }
      downloadBlob(storedAudio.blob, getAudioFilename(item, storedAudio.format));
      setActionStatus('Download started from locally stored audio.');
    } catch {
      setError({ code: null, message: 'Failed to download stored audio.' });
    }
  };

  const deleteServerGeneration = async (item: HistoryItem) => {
    const generationId = getServerGenerationId(item);
    const authHeader = buildAuthHeader();
    if (!generationId || !authHeader) return;

    await fetch(`/api/library/generations/${generationId}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteItem) return;
    const serverGenerationId = getServerGenerationId(pendingDeleteItem);
    if (pendingDeleteItem.audioStorageKey) {
      void deleteStoredAudio(pendingDeleteItem.audioStorageKey).catch(() => undefined);
    }
    if (serverGenerationId) {
      await deleteServerGeneration(pendingDeleteItem).catch(() => undefined);
    } else {
      removeHistoryItem(pendingDeleteItem.id);
    }
    setItems((prev) => prev.filter((item) => item.id !== pendingDeleteItem.id));
    setActionStatus(`${getItemTypeLabel(pendingDeleteItem.type)} removed from Library.`);
    setPendingDeleteItem(null);
  };

  const handleConfirmClearAll = () => {
    items.forEach((item) => {
      if (item.audioStorageKey) {
        void deleteStoredAudio(item.audioStorageKey).catch(() => undefined);
      }
      if (getServerGenerationId(item)) {
        void deleteServerGeneration(item).catch(() => undefined);
      }
    });
    clearHistory();
    setItems([]);
    setActionStatus('Library history cleared.');
    setIsClearDialogOpen(false);
  };

  const filteredItems = filter === 'all' ? items : items.filter((item) => item.type === filter);

  return (
    <Box display="grid" gap={6}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Library</h1>
          <Box color="gray.600" mt={1}>
            Your generated audio, music, image, and voice history. Local audio stays in this browser; provider image URLs expire after 24 hours.
          </Box>
        </Box>
        <Box display="flex" gap={2}>
          <Button variant="outline" colorPalette="blue" onClick={loadHistory}>
            Refresh
          </Button>
          {items.length > 0 && (
            <Button variant="destructive" onClick={() => setIsClearDialogOpen(true)}>
              Clear All
            </Button>
          )}
        </Box>
      </Box>

      {error && <ErrorDisplay code={error.code} message={error.message} />}
      {actionStatus && !error && (
        <Box border="1px solid" borderColor="green.100" borderLeft="3px solid" borderLeftColor="green.400" borderRadius="md" bg="white" p="0.75rem" color="green.800" fontSize="sm">
          {actionStatus}
        </Box>
      )}

      {items.length > 0 && (
        <Box display="flex" gap={2} flexWrap="wrap">
          {FILTERS.map((option) => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'solid' : 'outline'}
              colorPalette={filter === option.value ? 'green' : 'gray'}
              size="sm"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </Box>
      )}

      <Box display="grid" gap={4} gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}>
        {filteredItems.map((item) => (
          <LibraryItemCard
            key={item.id}
            item={item}
            onRefreshUrl={handleRefreshUrl}
            onDownload={handleDownload}
            onDelete={setPendingDeleteItem}
            isRefreshing={refreshingIds.has(item.id)}
          />
        ))}
        {items.length === 0 && (
          <Card accent="green" style={{ gridColumn: '1 / -1' }}>
            <CardHeader>
              <CardTitle>No history yet.</CardTitle>
              <CardDescription>
                Generate your first audio clip, track, or image to create a downloadable Library item.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        {items.length > 0 && filteredItems.length === 0 && (
          <Card accent="gray" style={{ gridColumn: '1 / -1' }}>
            <CardHeader>
              <CardTitle>No items match this filter</CardTitle>
              <CardDescription>Switch filters or generate new audio, music, images, and voices to add more Library items.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </Box>

      <ConfirmationDialog
        open={pendingDeleteItem !== null}
        onOpenChange={(open) => !open && setPendingDeleteItem(null)}
        title="Remove library item?"
        description="This removes the selected history entry from this browser. Generated files and MiniMax voices are not deleted."
        confirmLabel="Remove"
        onConfirm={handleConfirmDelete}
      />
      <ConfirmationDialog
        open={isClearDialogOpen}
        onOpenChange={setIsClearDialogOpen}
        title="Clear all library history?"
        description="This removes every saved history entry from this browser. This action cannot be undone."
        confirmLabel="Clear All"
        onConfirm={handleConfirmClearAll}
      />
    </Box>
  );
}
