import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Badge } from '@/components/ui/badge';
import { VoiceCard } from '@/components/voice/VoiceCard';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';
import { FLAG_SIZE_HEADER, getFlagUrl, getLanguageInfo } from '@/lib/language-flags';

interface VoiceGroupSectionProps {
  language: string;
  voices: VoiceDTO[];
  onDelete?: (voice: VoiceDTO) => void;
  deletingId?: string | null;
}

export function VoiceGroupSection({ language, voices, onDelete, deletingId }: VoiceGroupSectionProps) {
  const info = getLanguageInfo(language);
  const flagUrl = info.countryCode ? getFlagUrl(info.countryCode, FLAG_SIZE_HEADER) : null;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Box display="grid" gap={3}>
      <Box display="flex" alignItems="center" gap={2}>
        {flagUrl && !imgFailed ? (
          <img
            src={flagUrl}
            width={40}
            height={30}
            alt={info.displayName}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            style={{ display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: '1.5rem' }} aria-label={info.displayName}>
            {info.fallbackEmoji}
          </span>
        )}
        <Box fontSize="1.125rem" fontWeight="semibold">{info.displayName}</Box>
        <Badge variant="secondary">{voices.length}</Badge>
      </Box>
      <Box display="grid" gap={4} gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}>
        {voices.map((voice) => (
          <VoiceCard key={voice.voiceId} voice={voice} onDelete={onDelete} isDeleting={deletingId === voice.voiceId} />
        ))}
        {voices.length === 0 && (
          <p style={{ color: '#6b7280', gridColumn: '1 / -1', fontSize: '0.875rem' }}>No voices in this group match the current filter.</p>
        )}
      </Box>
    </Box>
  );
}
