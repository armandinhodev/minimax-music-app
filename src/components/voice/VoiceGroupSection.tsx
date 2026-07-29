import { Box } from '@chakra-ui/react';
import { Badge } from '@/components/ui/badge';
import { VoiceCard } from '@/components/voice/VoiceCard';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';
import { getLanguageInfo } from '@/lib/language-flags';

interface VoiceGroupSectionProps {
  language: string;
  voices: VoiceDTO[];
  onDelete?: (voice: VoiceDTO) => void;
  deletingId?: string | null;
}

export function VoiceGroupSection({ language, voices, onDelete, deletingId }: VoiceGroupSectionProps) {
  const { flag, displayName } = getLanguageInfo(language);

  return (
    <Box display="grid" gap={3}>
      <Box display="flex" alignItems="center" gap={2}>
        <span style={{ fontSize: '1.5rem' }} aria-label={displayName}>{flag}</span>
        <Box fontSize="1.125rem" fontWeight="semibold">{displayName}</Box>
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
