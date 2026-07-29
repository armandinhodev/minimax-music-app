'use client';

/**
 * VoiceSelector — voice dropdown with search.
 * Fetches voices from GET /api/minimax/voices and renders a searchable select.
 */

import { useEffect, useState, useMemo } from 'react';
import { Box } from '@chakra-ui/react';
import { Select, type SelectOption } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { authFetch, parseApiError } from '@/lib/auth-client';
import { getLanguageInfo } from '@/lib/language-flags';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';

interface VoiceSelectorProps {
  value: string;
  onChange: (voiceId: string) => void;
  label?: string;
  disabled?: boolean;
  filterType?: 'all' | 'system' | 'user';
}

export function VoiceSelector({
  value,
  onChange,
  label = 'Voice',
  disabled = false,
  filterType = 'all',
}: VoiceSelectorProps) {
  const [voices, setVoices] = useState<VoiceDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVoices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authFetch('/api/minimax/voices');
        if (!response.ok) {
          const err = await parseApiError(response);
          setError(err?.message ?? `HTTP ${response.status}`);
          return;
        }
        const data = await response.json();
        setVoices(data.voices ?? []);
      } catch {
        setError('Failed to load voices.');
      } finally {
        setIsLoading(false);
      }
    };
    loadVoices();
  }, []);

  const filteredVoices = useMemo(() => {
    // Designed voices are intentionally excluded from the /tts voice
    // selector. They remain visible in the gallery's "My Voices" tab
    // and in the Library history, but they are not offered as a target
    // for arbitrary TTS input. Cloned voices and system voices still
    // appear here.
    const withoutDesigned = voices.filter((voice) => voice.type !== 'design');
    if (filterType === 'system') {
      return withoutDesigned.filter((voice) => voice.type === 'system');
    }
    if (filterType === 'user') {
      return withoutDesigned.filter((voice) => voice.type !== 'system');
    }
    return withoutDesigned;
  }, [voices, filterType]);

  const voiceOptions = useMemo<SelectOption[]>(
    () =>
      filteredVoices.map((v) => ({
        value: v.voiceId,
        label: `${v.name} (${v.voiceId})`,
        flag: v.language ? getLanguageInfo(v.language) : undefined,
      })),
    [filteredVoices]
  );

  const selectedVoice = voices.find((v) => v.voiceId === value);

  return (
    <Box display="grid" gap={2}>
      <Label htmlFor="voice-selector">{label}</Label>
      <Select
        id="voice-selector"
        value={value}
        onValueChange={(v) => v && onChange(v)}
        disabled={disabled || isLoading}
        options={voiceOptions}
        placeholder={isLoading ? 'Loading voices...' : 'Select a voice'}
        groupBy={(o) => o.flag?.displayName ?? 'My Voices'}
        groupOrder={(key) => (key === 'My Voices' ? -1 : 0)}
        searchable
      />
      {error && <p style={{ fontSize: '0.75rem', color: '#dc2626' }}>{error}</p>}
      {selectedVoice && (
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Voice ID: <code style={{ backgroundColor: '#f3f4f6', padding: '0 0.25rem', borderRadius: '0.25rem' }}>{selectedVoice.voiceId}</code>
        </p>
      )}
    </Box>
  );
}