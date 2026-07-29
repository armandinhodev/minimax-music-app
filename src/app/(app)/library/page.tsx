'use client';

/**
 * Library page — local history of generated audio.
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
import { authFetch, parseApiError } from '@/lib/auth-client';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { TTLCounter } from '@/components/shared/TTLCounter';
import { getHistoryItems, removeHistoryItem, clearHistory, updateHistoryItemTtl } from '@/lib/history';
import type { HistoryItem } from '@/lib/history';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

interface LibraryItemCardProps {
  item: HistoryItem;
  onRefreshUrl: (item: HistoryItem) => Promise<void>;
  onDelete: (id: string) => void;
  isRefreshing: boolean;
}

function LibraryItemCard({ item, onRefreshUrl, onDelete, isRefreshing }: LibraryItemCardProps) {
  return (
    <Card>
      <CardHeader>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <CardTitle style={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>{item.type}</CardTitle>
            <CardDescription style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {formatDate(item.createdAt)}
            </CardDescription>
          </Box>
          <Badge variant="outline">{item.type}</Badge>
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

        <Box display="flex" alignItems="center" gap={2} mt={2}>
          {item.ttlExpiry && <TTLCounter expiresAt={item.ttlExpiry} label="URL TTL" />}
          {item.fileId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefreshUrl(item)}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh URL'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}>
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

  const loadHistory = () => {
    setItems(getHistoryItems());
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRefreshUrl = async (item: HistoryItem) => {
    if (!item.fileId) return;

    setRefreshingIds((prev) => new Set(prev).add(item.id));
    setError(null);

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

  const handleDelete = (id: string) => {
    removeHistoryItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Clear all library history?')) {
      clearHistory();
      setItems([]);
    }
  };

  return (
    <Box display="grid" gap={6}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Library</h1>
          <Box color="gray.600" mt={1}>
            Your generated audio history. Download URLs are valid for 9 hours.
          </Box>
        </Box>
        <Box display="flex" gap={2}>
          <Button variant="outline" onClick={loadHistory}>
            Refresh
          </Button>
          {items.length > 0 && (
            <Button variant="outline" onClick={handleClearAll}>
              Clear All
            </Button>
          )}
        </Box>
      </Box>

      {error && <ErrorDisplay code={error.code} message={error.message} />}

      <Box display="grid" gap={4} gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}>
        {items.map((item) => (
          <LibraryItemCard
            key={item.id}
            item={item}
            onRefreshUrl={handleRefreshUrl}
            onDelete={handleDelete}
            isRefreshing={refreshingIds.has(item.id)}
          />
        ))}
        {items.length === 0 && (
          <p style={{ color: '#6b7280', gridColumn: '1 / -1', fontSize: '0.875rem' }}>
            No history yet. Generate audio in Text to Speech to see it here.
          </p>
        )}
      </Box>
    </Box>
  );
}
