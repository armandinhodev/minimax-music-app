'use client';

/**
 * Voice gallery page.
 * Tabs: System Voices | My Voices.
 * VoiceCard grid with search/filter.
 */

import { useEffect, useMemo, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authFetch, parseApiError } from '@/lib/auth-client';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';
import Link from 'next/link';
import { VoiceCard } from '@/components/voice/VoiceCard';
import { VoiceGroupSection } from '@/components/voice/VoiceGroupSection';
import { getLanguageInfo } from '@/lib/language-flags';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

export default function VoicesPage() {
  const [systemVoices, setSystemVoices] = useState<VoiceDTO[]>([]);
  const [userVoices, setUserVoices] = useState<VoiceDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: number | null; message: string | null } | null>(null);
  const [filter, setFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteVoice, setPendingDeleteVoice] = useState<VoiceDTO | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const loadVoices = async () => {
    setIsLoading(true);
    setError(null);
    setActionStatus(null);

    try {
      const response = await authFetch('/api/minimax/voices');

      if (!response.ok) {
        const err = await parseApiError(response);
        setError({ code: err?.code ?? response.status, message: err?.message ?? `HTTP ${response.status}` });
        return;
      }

      const data = await response.json();
      const voices: VoiceDTO[] = data.voices ?? [];

      setSystemVoices(voices.filter((v) => v.type === 'system'));
      setUserVoices(voices.filter((v) => v.type !== 'system'));
    } catch {
      setError({ code: null, message: 'Failed to load voices. Check your connection.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVoices();
  }, []);

  const handleConfirmDelete = async () => {
    if (!pendingDeleteVoice) return;
    const voice = pendingDeleteVoice;
    const { voiceId } = voice;

    setDeletingId(voiceId);
    try {
      const response = await authFetch('/api/minimax/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, voiceType: voice.type === 'design' ? 'voice_generation' : 'voice_cloning' }),
      });

      if (!response.ok) {
        const err = await parseApiError(response);
        setError({ code: err?.code ?? response.status, message: err?.message ?? `HTTP ${response.status}` });
        return;
      }

      // Remove from user voices list
      setUserVoices((prev) => prev.filter((v) => v.voiceId !== voiceId));
      setActionStatus('Voice deleted from My Voices.');
      setPendingDeleteVoice(null);
    } catch {
      setError({ code: null, message: 'Failed to delete voice.' });
    } finally {
      setDeletingId(null);
    }
  };

  const normalizedFilter = filter.trim().toLowerCase();

  const filteredUserVoices = useMemo(() => {
    if (!normalizedFilter) return userVoices;
    return userVoices.filter(
      (voice) =>
        voice.name.toLowerCase().includes(normalizedFilter) ||
        voice.voiceId.toLowerCase().includes(normalizedFilter) ||
        (voice.language ?? '').toLowerCase().includes(normalizedFilter)
    );
  }, [userVoices, normalizedFilter]);

  const groupedSystemVoices = useMemo(() => {
    const groups = new Map<string, VoiceDTO[]>();
    for (const voice of systemVoices) {
      const language = voice.language ?? 'Unknown';
      groups.set(language, [...(groups.get(language) ?? []), voice]);
    }
    return [...groups.entries()]
      .map(([language, voices]) => ({ language, voices, ...getLanguageInfo(language) }))
      .sort((a, b) => b.voices.length - a.voices.length || a.displayName.localeCompare(b.displayName));
  }, [systemVoices]);

  const filteredSystemGroups = useMemo(
    () => groupedSystemVoices.map((group) => ({
      ...group,
      voices: normalizedFilter
        ? group.voices.filter(
          (voice) =>
            voice.name.toLowerCase().includes(normalizedFilter) ||
            voice.voiceId.toLowerCase().includes(normalizedFilter) ||
            (voice.language ?? '').toLowerCase().includes(normalizedFilter)
        )
        : group.voices,
    })),
    [groupedSystemVoices, normalizedFilter]
  );

  const hasFilteredSystemVoices = filteredSystemGroups.some((group) => group.voices.length > 0);

  return (
    <Box display="grid" gap={6}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Voices</h1>
          <Box color="gray.600" mt={1}>
            Browse system voices or manage your cloned and designed voices.
          </Box>
        </Box>
        <Button variant="outline" colorPalette="blue" onClick={loadVoices} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </Box>

      {error && <ErrorDisplay code={error.code} message={error.message} />}
      {actionStatus && !error && (
        <Box border="1px solid" borderColor="green.100" borderLeft="3px solid" borderLeftColor="green.400" borderRadius="md" bg="white" p="0.75rem" color="green.800" fontSize="sm">
          {actionStatus}
        </Box>
      )}

      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system">System Voices</TabsTrigger>
          <TabsTrigger value="user">My Voices ({userVoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="system">
          <Box mt={4}>
            <Box mb={4}>
              <Box maxW="20rem">
                <Input
                  placeholder="Filter system voices..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </Box>
            </Box>
            <Box display="grid" gap={8}>
              {filteredSystemGroups.filter((group) => group.voices.length > 0).map((group) => (
                <VoiceGroupSection key={group.language} language={group.language} voices={group.voices} />
              ))}
              {!hasFilteredSystemVoices && (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  {filter ? 'No matching system voices.' : 'No system voices available.'}
                </p>
              )}
            </Box>
          </Box>
        </TabsContent>

        <TabsContent value="user">
          <Box mt={4}>
            <Box mb={4} border="1px solid" borderColor="green.100" borderLeft="3px solid" borderLeftColor="green.400" borderRadius="md" bg="white" p="0.75rem" color="gray.700" fontSize="sm">
              My Voices contains cloned and designed voices you created. Fresh voices may appear here after refresh, and they are available in Text to Speech from local history while MiniMax updates its voice list.
            </Box>
            <Box mb={4} display="flex" alignItems="center" justifyContent="space-between">
              <Box maxW="20rem">
                <Input
                  placeholder="Filter my voices..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </Box>
              <Box display="flex" gap={2}>
                <Link
                  href="/voices/clone"
                  style={{ display: 'inline-flex', height: '1.75rem', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderRadius: '0.375rem', border: '1px solid #86efac', backgroundColor: 'white', padding: '0 0.75rem', fontSize: '0.875rem', color: '#166534', fontWeight: 500 }}
                >
                  Clone a Voice
                </Link>
                <Link
                  href="/voices/design"
                  style={{ display: 'inline-flex', height: '1.75rem', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderRadius: '0.375rem', border: '1px solid #5eead4', backgroundColor: 'white', padding: '0 0.75rem', fontSize: '0.875rem', color: '#0f766e', fontWeight: 500 }}
                >
                  Design a Voice
                </Link>
              </Box>
            </Box>
            {userVoices.length > 0 && (
              <Box display="flex" gap={2} flexWrap="wrap" mb={4}>
                <Badge variant="success">My Voices</Badge>
                <Badge variant="purple">Cloned</Badge>
                <Badge variant="info">Designed</Badge>
              </Box>
            )}
            <Box display="grid" gap={4} gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}>
              {filteredUserVoices.map((voice) => (
                <VoiceCard
                  key={voice.voiceId}
                  voice={voice}
                  onDelete={setPendingDeleteVoice}
                  isDeleting={deletingId === voice.voiceId}
                />
              ))}
              {filteredUserVoices.length === 0 && (
                <Card accent="green" style={{ gridColumn: '1 / -1' }}>
                  <CardHeader>
                    <CardTitle>{filter ? 'No matching My Voices' : 'No custom voices yet'}</CardTitle>
                    <CardDescription>
                      {filter
                        ? 'Clear the filter to see all cloned and designed voices.'
                        : 'Clone a voice from an audio sample or design one from a prompt, then use it in Text to Speech.'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </Box>
          </Box>
        </TabsContent>
      </Tabs>

      <ConfirmationDialog
        open={pendingDeleteVoice !== null}
        onOpenChange={(open) => !open && setPendingDeleteVoice(null)}
        title="Delete voice?"
        description={`Delete ${pendingDeleteVoice?.voiceId ?? 'this voice'} from MiniMax? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        loading={deletingId !== null}
      />
    </Box>
  );
}
