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
import { getHistoryItems } from '@/lib/history';
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
    // All user voices (clone + design) and system voices are selectable
    // targets for TTS. Per MiniMax API docs (voice-design/api-overview):
    // "The generated voices (voice_id) can then be used in the T2A API
    // and the T2A Async API for speech generation." Designed voices are
    // NOT excluded here.
    //
    // Workaround for MiniMax /v1/get_voice not listing designed voices:
    // the API returns voice_generation: [] even after designing (verified
    // empirically), so we supplement the API list with designed voices
    // from localStorage history. These have a 168-hour TTL per MiniMax
    // docs; we filter by ttlExpiry so expired entries don't surface.
    // API voices take precedence on duplicate voiceId.
    const fromHistory = (() => {
      if (typeof window === 'undefined') return [];
      const items = getHistoryItems();
      const now = Date.now();
      return items
        .filter(
          (item) =>
            item.type === 'design' &&
            typeof item.voiceId === 'string' &&
            item.voiceId.length > 0 &&
            typeof item.ttlExpiry === 'number' &&
            item.ttlExpiry > now,
        )
        .map<VoiceDTO>((item) => ({
          voiceId: item.voiceId as string,
          // History doesn't store the voice name; fall back to the voiceId
          // as the human-readable label. Library already shows the full
          // voiceId next to history entries, so users recognize them.
          name: item.voiceId as string,
          type: 'design',
          ttlExpiry: item.ttlExpiry,
          createdAt: item.createdAt,
        }));
    })();

    const apiVoiceIds = new Set(voices.map((v) => v.voiceId));
    const designedFromHistory = fromHistory.filter(
      (v) => !apiVoiceIds.has(v.voiceId),
    );
    const merged = [...voices, ...designedFromHistory];

    if (filterType === 'system') {
      return merged.filter((voice) => voice.type === 'system');
    }
    if (filterType === 'user') {
      return merged.filter((voice) => voice.type !== 'system');
    }
    return merged;
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