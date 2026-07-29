'use client';

/**
 * TTLCounter — live countdown badge for expiring voices/URLs.
 * Takes an expiresAt Unix timestamp (ms) and renders a countdown.
 * Shows "Expired" when TTL reaches zero.
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface TTLCounterProps {
  expiresAt: number;
  label?: string;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function TTLCounter({ expiresAt, label = 'TTL' }: TTLCounterProps) {
  const [remaining, setRemaining] = useState<number>(() => {
    return Math.max(0, expiresAt - Date.now());
  });

  useEffect(() => {
    const tick = () => {
      setRemaining(Math.max(0, expiresAt - Date.now()));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const isExpired = remaining <= 0;

  return (
    <Badge
      variant={isExpired ? 'secondary' : 'default'}
      style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
    >
      {label}: {formatCountdown(remaining)}
    </Badge>
  );
}
