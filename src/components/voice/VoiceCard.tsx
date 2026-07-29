'use client';

/**
 * VoiceCard — voice card with TTL countdown badge.
 * Shows voice name, ID, type badge, TTL countdown (if ttlExpiry set),
 * and supports use-in-T2A and delete actions.
 */

import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TTLCounter } from '@/components/shared/TTLCounter';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';
import { getLanguageInfo } from '@/lib/language-flags';

interface VoiceCardProps {
  voice: VoiceDTO;
  onUse?: (voiceId: string) => void;
  onDelete?: (voice: VoiceDTO) => void;
  isDeleting?: boolean;
}

function VoiceTypeBadge({ type }: { type: VoiceDTO['type'] }) {
  const variants: Record<VoiceDTO['type'], 'default' | 'secondary' | 'outline'> = {
    system: 'default',
    clone: 'secondary',
    design: 'outline',
  };
  return <Badge variant={variants[type]}>{type}</Badge>;
}

export function VoiceCard({ voice, onUse, onDelete, isDeleting = false }: VoiceCardProps) {
  const createdDate = new Date(voice.createdAt).toLocaleDateString();
  const languageInfo = voice.language ? getLanguageInfo(voice.language) : null;

  return (
    <Card>
      <CardHeader>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box minW={0} flex={1}>
            <Box display="flex" alignItems="center" gap={1} minW={0}>
              {voice.type === 'system' && languageInfo && (
                <span style={{ fontSize: '1rem' }} aria-label={languageInfo.displayName}>{languageInfo.flag}</span>
              )}
              <CardTitle style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{voice.name}</CardTitle>
            </Box>
            <CardDescription style={{ fontSize: '0.75rem', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={voice.voiceId}>
              {voice.voiceId}
            </CardDescription>
          </Box>
          <VoiceTypeBadge type={voice.type} />
        </Box>
      </CardHeader>
      <CardContent display="flex" flexDirection="column" gap={2}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Created {createdDate}</span>
          {voice.ttlExpiry && <TTLCounter expiresAt={voice.ttlExpiry} label="TTL" />}
        </Box>
        <Box display="flex" gap={1} style={{ marginTop: '0.25rem' }}>
          {onUse && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUse(voice.voiceId)}
              disabled={isDeleting}
            >
              Use in TTS
            </Button>
          )}
          {voice.type !== 'system' && onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(voice)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
