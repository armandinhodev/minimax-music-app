'use client';

/**
 * Voice gallery page.
 * Tabs: System Voices | My Voices.
 * VoiceCard grid with search/filter.
 */

import { useEffect, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authFetch, parseApiError } from '@/lib/auth-client';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';
import Link from 'next/link';
import { VoiceCard } from '@/components/voice/VoiceCard';

export default function VoicesPage() {
  const [systemVoices, setSystemVoices] = useState<VoiceDTO[]>([]);
  const [userVoices, setUserVoices] = useState<VoiceDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: number | null; message: string | null } | null>(null);
  const [filter, setFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadVoices = async () => {
    setIsLoading(true);
    setError(null);

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

  const handleDelete = async (voice: VoiceDTO) => {
    const { voiceId } = voice;
    if (!confirm(`Delete voice ${voiceId}? This cannot be undone.`)) return;

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
    } catch {
      setError({ code: null, message: 'Failed to delete voice.' });
    } finally {
      setDeletingId(null);
    }
  };

  const filterVoices = (voices: VoiceDTO[]) => {
    if (!filter.trim()) return voices;
    const q = filter.toLowerCase();
    return voices.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.voiceId.toLowerCase().includes(q)
    );
  };

  return (
    <Box display="grid" gap={6}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Voices</h1>
          <Box color="gray.600" mt={1}>
            Browse system voices or manage your cloned and designed voices.
          </Box>
        </Box>
        <Button variant="outline" onClick={loadVoices} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </Box>

      {error && <ErrorDisplay code={error.code} message={error.message} />}

      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system">System Voices</TabsTrigger>
          <TabsTrigger value="user">My Voices</TabsTrigger>
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
            <Box display="grid" gap={4} gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}>
              {filterVoices(systemVoices).map((voice) => (
                <VoiceCard key={voice.voiceId} voice={voice} />
              ))}
              {filterVoices(systemVoices).length === 0 && (
                <p style={{ color: '#6b7280', gridColumn: '1 / -1', fontSize: '0.875rem' }}>
                  {filter ? 'No matching system voices.' : 'No system voices available.'}
                </p>
              )}
            </Box>
          </Box>
        </TabsContent>

        <TabsContent value="user">
          <Box mt={4}>
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
                  style={{ display: 'inline-flex', height: '1.75rem', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', backgroundColor: 'white', padding: '0 0.75rem', fontSize: '0.875rem' }}
                >
                  Clone a Voice
                </Link>
                <Link
                  href="/voices/design"
                  style={{ display: 'inline-flex', height: '1.75rem', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', backgroundColor: 'white', padding: '0 0.75rem', fontSize: '0.875rem' }}
                >
                  Design a Voice
                </Link>
              </Box>
            </Box>
            <Box display="grid" gap={4} gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}>
              {filterVoices(userVoices).map((voice) => (
                <VoiceCard
                  key={voice.voiceId}
                  voice={voice}
                  onDelete={handleDelete}
                  isDeleting={deletingId === voice.voiceId}
                />
              ))}
              {filterVoices(userVoices).length === 0 && (
                <p style={{ color: '#6b7280', gridColumn: '1 / -1', fontSize: '0.875rem' }}>
                  {filter
                    ? 'No matching voices.'
                    : 'You have no cloned or designed voices yet. Clone or design one to get started.'}
                </p>
              )}
            </Box>
          </Box>
        </TabsContent>
      </Tabs>
    </Box>
  );
}
