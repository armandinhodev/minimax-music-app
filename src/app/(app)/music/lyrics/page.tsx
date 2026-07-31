'use client';

import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, type SelectOption } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { authFetch, parseApiError } from '@/lib/auth-client';

const PROMPT_MAX_LENGTH = 2000;
const LYRICS_MAX_LENGTH = 3500;

const MODE_OPTIONS: SelectOption[] = [
  { value: 'write_full_song', label: 'Write full song' },
  { value: 'edit', label: 'Edit existing lyrics' },
];

interface LyricsGenerationResult {
  songTitle: string;
  styleTags: string[];
  lyrics: string;
  metadata: {
    status?: number;
    message?: string;
  };
}

function buildMusicGenerationHref(result: LyricsGenerationResult, prompt: string): string {
  const params = new URLSearchParams();
  params.set('lyrics', result.lyrics);
  if (prompt.trim()) params.set('prompt', prompt.trim());
  return `/music?${params.toString()}`;
}

export default function LyricsGenerationPage() {
  const [mode, setMode] = useState('write_full_song');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: number | null; message: string | null } | null>(null);
  const [result, setResult] = useState<LyricsGenerationResult | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const validationMessage = (() => {
    if (prompt.length > PROMPT_MAX_LENGTH) return 'Prompt exceeds 2,000 characters.';
    if (lyrics.length > LYRICS_MAX_LENGTH) return 'Lyrics exceed 3,500 characters.';
    if (mode === 'edit' && lyrics.trim().length === 0) return 'Paste the lyrics you want MiniMax to edit.';
    return null;
  })();
  const canGenerate = !isLoading && validationMessage === null;

  const handleGenerate = async () => {
    if (validationMessage) {
      setError({ code: null, message: validationMessage });
      return;
    }

    setError(null);
    setActionStatus(null);
    setIsLoading(true);
    setResult(null);

    try {
      const response = await authFetch('/api/minimax/music/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          prompt: prompt.trim(),
          lyrics: lyrics.trim(),
          title: title.trim(),
        }),
      });

      if (!response.ok) {
        const err = await parseApiError(response);
        setError({ code: err?.code ?? response.status, message: err?.message ?? `HTTP ${response.status}` });
        return;
      }

      const data = await response.json() as LyricsGenerationResult;
      setResult(data);
      setActionStatus('Lyrics generated. Copy them or open Music Generation with these lyrics prefilled.');
    } catch {
      setError({ code: null, message: 'Failed to generate lyrics. Check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLyrics = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.lyrics);
      setActionStatus('Lyrics copied to clipboard.');
    } catch {
      setActionStatus('Could not access the clipboard. Select the lyrics manually to copy them.');
    }
  };

  return (
    <Box display="grid" gap={6} width="100%">
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={4} flexWrap="wrap">
        <Box maxW="52rem">
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Lyrics Generation</h1>
          <Box color="gray.600" mt={1}>
            Draft complete MiniMax-ready song lyrics or edit an existing lyric sheet before generating music.
          </Box>
        </Box>
        <Box border="1px solid" borderColor="purple.100" borderLeft="3px solid" borderLeftColor="purple.400" borderRadius="md" bg="white" p="0.75rem" color="gray.700" fontSize="sm" maxW="24rem">
          Generated lyrics can be sent directly into Music Generation. Prompts are capped at 2,000 characters and lyrics at 3,500.
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', xl: 'minmax(0, 0.95fr) minmax(0, 1.15fr)' }} gap={6} alignItems="start">
        <Card accent="purple">
          <CardHeader>
            <CardTitle>Lyric Brief</CardTitle>
            <CardDescription>Choose whether MiniMax should write from scratch or revise your existing lyrics.</CardDescription>
          </CardHeader>
          <CardContent display="grid" gap={4}>
            <Box display="grid" gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <Box display="grid" gap={2}>
                <Label>Mode</Label>
                <Select value={mode} onValueChange={setMode} options={MODE_OPTIONS} disabled={isLoading} />
              </Box>
              <Box display="grid" gap={2}>
                <Label htmlFor="lyrics-title">Title (optional)</Label>
                <Input id="lyrics-title" value={title} disabled={isLoading} placeholder="Neon Afterglow" onChange={(event) => setTitle(event.currentTarget.value)} />
              </Box>
            </Box>

            <Box display="grid" gap={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                <Label htmlFor="lyrics-prompt">Prompt</Label>
                <Box as="span" color={prompt.length > PROMPT_MAX_LENGTH ? 'red.600' : 'gray.500'} fontSize="sm">{prompt.length}/{PROMPT_MAX_LENGTH}</Box>
              </Box>
              <Textarea
                id="lyrics-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.currentTarget.value)}
                disabled={isLoading}
                maxLength={PROMPT_MAX_LENGTH + 100}
                minH="9rem"
                placeholder="Example: Write a hopeful synth-pop song about rebuilding trust after a long night drive. Keep the chorus memorable and direct."
              />
            </Box>

            <Box display="grid" gap={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                <Label htmlFor="source-lyrics">Existing lyrics {mode === 'edit' ? '(required)' : '(optional)'}</Label>
                <Box as="span" color={lyrics.length > LYRICS_MAX_LENGTH ? 'red.600' : 'gray.500'} fontSize="sm">{lyrics.length}/{LYRICS_MAX_LENGTH}</Box>
              </Box>
              <Textarea
                id="source-lyrics"
                value={lyrics}
                onChange={(event) => setLyrics(event.currentTarget.value)}
                disabled={isLoading}
                maxLength={LYRICS_MAX_LENGTH + 100}
                minH="14rem"
                placeholder={'[Verse]\nDraft lyrics to revise...\n[Chorus]\nA stronger hook goes here'}
              />
            </Box>

            {validationMessage && (
              <Box border="1px solid" borderColor="orange.100" borderLeft="3px solid" borderLeftColor="orange.400" borderRadius="md" bg="white" p="0.75rem" color="orange.800" fontSize="sm">
                {validationMessage}
              </Box>
            )}
            {error && <ErrorDisplay code={error.code ?? null} message={error.message ?? ''} />}
            {actionStatus && !error && (
              <Box border="1px solid" borderColor="green.100" borderLeft="3px solid" borderLeftColor="green.400" borderRadius="md" bg="white" p="0.75rem" color="green.800" fontSize="sm">
                {actionStatus}
              </Box>
            )}

            <Button onClick={handleGenerate} disabled={!canGenerate} colorPalette="purple">
              {isLoading ? 'Generating lyrics...' : 'Generate Lyrics'}
            </Button>
          </CardContent>
        </Card>

        <Card accent="green" minH="28rem">
          <CardHeader>
            <CardTitle>Generated Lyrics</CardTitle>
            <CardDescription>{result ? result.songTitle || 'Untitled song' : 'Lyrics, title, and style tags appear here after generation.'}</CardDescription>
          </CardHeader>
          <CardContent display="grid" gap={4}>
            {!result && !isLoading && (
              <Box border="1px dashed" borderColor="gray.200" borderRadius="xl" p="2rem" textAlign="center" color="gray.600" bg="white">
                Write a focused brief, then generate lyrics ready for MiniMax Music Generation.
              </Box>
            )}
            {isLoading && (
              <Box border="1px dashed" borderColor="purple.200" borderRadius="xl" p="2rem" textAlign="center" color="gray.600" bg="white">
                Writing lyrics with MiniMax Music. This is a billable POST, so the app will not retry automatically.
              </Box>
            )}
            {result && (
              <Box display="grid" gap={4}>
                <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
                  <Box color="gray.600" fontSize="sm">
                    {result.styleTags.length ? result.styleTags.join(' · ') : 'No style tags returned'}
                  </Box>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Button variant="outline" colorPalette="blue" size="sm" onClick={handleCopyLyrics}>Copy Lyrics</Button>
                    <Box asChild borderRadius="md" bg="#16a34a" color="white" px="0.75rem" py="0.4rem" fontSize="sm" fontWeight={600} textDecoration="none">
                      <a href={buildMusicGenerationHref(result, prompt)}>Use in Music Generation</a>
                    </Box>
                  </Box>
                </Box>
                <Box as="pre" whiteSpace="pre-wrap" border="1px solid" borderColor="green.100" borderRadius="xl" bg="white" p="1rem" color="gray.800" overflowX="auto">
                  {result.lyrics}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
