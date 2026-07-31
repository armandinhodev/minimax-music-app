'use client';

import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { AudioPlayer } from '@/components/tts/AudioPlayer';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, type SelectOption } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { authFetch, parseApiError } from '@/lib/auth-client';
import { storeAudioFromHex } from '@/lib/audio-storage';
import { saveHistoryItem } from '@/lib/history';

const PROMPT_MAX_LENGTH = 2000;
const LYRICS_MAX_LENGTH = 3500;
const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_BITRATE = 256000;

const MODEL_OPTIONS: SelectOption[] = [
  { value: 'music-3.0', label: 'music-3.0' },
  { value: 'music-3.0-free', label: 'music-3.0-free' },
];

interface MusicGenerationResult {
  id: string;
  audio: string;
  format: 'mp3';
  metadata: {
    status?: string | number;
    traceId?: string;
    durationSeconds?: number;
    sampleRate?: number;
    channels?: number;
    bitrate?: number;
    sizeBytes?: number;
  };
}

function downloadMusicHex(hex: string, format: string, id: string): void {
  const clean = hex.replace(/\s/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `minimax-music-${id}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function MusicPage() {
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [model, setModel] = useState('music-3.0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: number | null; message: string | null } | null>(null);
  const [result, setResult] = useState<MusicGenerationResult | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const trimmedPrompt = prompt.trim();
  const trimmedLyrics = lyrics.trim();
  const promptCharacters = prompt.length;
  const lyricsCharacters = lyrics.length;
  const validationMessage = (() => {
    if (instrumental && trimmedPrompt.length === 0) return 'Describe the instrumental style before generating.';
    if (!instrumental && trimmedLyrics.length === 0) return 'Add lyrics before generating vocal music.';
    if (promptCharacters > PROMPT_MAX_LENGTH) return 'Prompt exceeds 2,000 characters.';
    if (lyricsCharacters > LYRICS_MAX_LENGTH) return 'Lyrics exceed 3,500 characters.';
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
      const response = await authFetch('/api/minimax/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: trimmedPrompt,
          lyrics: instrumental ? '' : trimmedLyrics,
          instrumental,
          stream: false,
          outputFormat: 'hex',
          audioSetting: {
            sampleRate: DEFAULT_SAMPLE_RATE,
            bitrate: DEFAULT_BITRATE,
            format: 'mp3',
          },
        }),
      });

      if (!response.ok) {
        const err = await parseApiError(response);
        setError({ code: err?.code ?? response.status, message: err?.message ?? `HTTP ${response.status}` });
        return;
      }

      const data = await response.json() as MusicGenerationResult;
      setResult(data);

      try {
        const audioStorageKey = await storeAudioFromHex(data.audio, data.format);
        saveHistoryItem({
          type: 'music',
          source: instrumental ? 'instrumental-music' : 'text-to-music',
          text: trimmedPrompt,
          lyrics: instrumental ? undefined : trimmedLyrics,
          audioStorageKey,
          format: data.format,
          model,
          instrumental,
          durationSeconds: data.metadata.durationSeconds,
          sampleRate: data.metadata.sampleRate ?? DEFAULT_SAMPLE_RATE,
          bitrate: data.metadata.bitrate ?? DEFAULT_BITRATE,
        });
        setActionStatus('Music generated, stored locally in this browser, and saved to Library.');
      } catch {
        setActionStatus('Music generated for preview, but browser storage was unavailable. Download the track before leaving this page.');
      }
    } catch {
      setError({ code: null, message: 'Failed to generate music. Check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box display="grid" gap={6} width="100%">
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={4} flexWrap="wrap">
        <Box maxW="52rem">
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Music Generation</h1>
          <Box color="gray.600" mt={1}>
            Create full MiniMax music tracks from lyrics and style direction, or switch to instrumental mode for prompt-led compositions.
          </Box>
        </Box>
        <Box border="1px solid" borderColor="purple.100" borderLeft="3px solid" borderLeftColor="purple.400" borderRadius="md" bg="white" p="0.75rem" color="gray.700" fontSize="sm" maxW="24rem">
          Output is MP3 at 44.1 kHz and 256 kbps. Generated audio is stored in IndexedDB, while Library keeps only safe metadata references.
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', xl: 'minmax(0, 0.95fr) minmax(0, 1.15fr)' }} gap={6} alignItems="start">
        <Card accent="purple">
          <CardHeader>
            <CardTitle>Composition Brief</CardTitle>
            <CardDescription>
              Guide the arrangement with genre, mood, tempo, instrumentation, structure, and production references.
            </CardDescription>
          </CardHeader>
          <CardContent display="grid" gap={4}>
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={3} border="1px solid" borderColor="purple.100" borderRadius="lg" p="0.75rem" bg="white">
              <Box>
                <Label htmlFor="instrumental-mode">Instrumental mode</Label>
                <Box color="gray.600" fontSize="sm">Use prompt-only generation when you do not need vocals.</Box>
              </Box>
              <Switch id="instrumental-mode" checked={instrumental} onChange={setInstrumental} disabled={isLoading} />
            </Box>

            <Box display="grid" gap={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                <Label htmlFor="music-prompt">Style prompt</Label>
                <Box as="span" color={promptCharacters > PROMPT_MAX_LENGTH ? 'red.600' : 'gray.500'} fontSize="sm">
                  {promptCharacters}/{PROMPT_MAX_LENGTH}
                </Box>
              </Box>
              <Textarea
                id="music-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.currentTarget.value)}
                disabled={isLoading}
                maxLength={PROMPT_MAX_LENGTH + 100}
                minH="8rem"
                placeholder="Example: Cinematic synth-pop at 118 BPM, bright analog bass, crisp drums, uplifting chorus, glossy modern mix."
              />
              <Box color="gray.600" fontSize="sm">
                {instrumental ? 'Required for instrumental music.' : 'Optional for vocal music, but strongly recommended for better direction.'}
              </Box>
            </Box>

            <Box display="grid" gap={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                <Label htmlFor="music-lyrics">Lyrics</Label>
                <Box as="span" color={lyricsCharacters > LYRICS_MAX_LENGTH ? 'red.600' : 'gray.500'} fontSize="sm">
                  {lyricsCharacters}/{LYRICS_MAX_LENGTH}
                </Box>
              </Box>
              <Textarea
                id="music-lyrics"
                value={lyrics}
                onChange={(event) => setLyrics(event.currentTarget.value)}
                disabled={isLoading || instrumental}
                maxLength={LYRICS_MAX_LENGTH + 100}
                minH="14rem"
                placeholder={'[Verse]\nLate city lights and a silver sky\n[Chorus]\nWe keep moving where the echoes fly'}
              />
              <Box color="gray.600" fontSize="sm">
                Use structure tags like [Intro], [Verse], [Chorus], and [Bridge]. Lyrics are required when instrumental mode is off.
              </Box>
            </Box>

            <Box display="grid" gridTemplateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={4}>
              <Box display="grid" gap={2}>
                <Label>Model</Label>
                <Select value={model} onValueChange={setModel} options={MODEL_OPTIONS} disabled={isLoading} />
              </Box>
              <Box display="grid" gap={2}>
                <Label>Audio settings</Label>
                <Box border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white" px="0.75rem" py="0.5rem" color="gray.700" fontSize="sm">
                  MP3 · 44.1 kHz · 256 kbps
                </Box>
              </Box>
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
              {isLoading ? 'Generating music...' : 'Generate Music'}
            </Button>
          </CardContent>
        </Card>

        <Card accent="green" minH="28rem">
          <CardHeader>
            <CardTitle>Track Preview</CardTitle>
            <CardDescription>
              {result
                ? `${result.metadata.durationSeconds ? `${Math.round(result.metadata.durationSeconds)}s · ` : ''}${result.format.toUpperCase()} · ${result.metadata.sampleRate ?? DEFAULT_SAMPLE_RATE} Hz`
                : 'Generated tracks appear here with playback, download, and Library persistence.'}
            </CardDescription>
          </CardHeader>
          <CardContent display="grid" gap={4}>
            {isLoading && (
              <Box border="1px dashed" borderColor="purple.200" borderRadius="xl" p="2rem" textAlign="center" color="gray.600" bg="white">
                Composing your track with MiniMax Music. Keep this tab open until generation completes.
              </Box>
            )}

            {!isLoading && !result && (
              <Box border="1px dashed" borderColor="gray.200" borderRadius="xl" p="2rem" textAlign="center" color="gray.600" bg="white">
                Start with a focused brief and complete lyrics. Your generated track will be saved to Library automatically when browser storage is available.
              </Box>
            )}

            {result && (
              <Box display="grid" gap={4}>
                <Box border="1px solid" borderColor="green.100" borderRadius="xl" bg="white" p="1rem" display="grid" gap={3}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
                    <Box>
                      <Box fontWeight={700}>Generated track</Box>
                      <Box color="gray.600" fontSize="sm">Trace: {result.metadata.traceId ?? result.id}</Box>
                    </Box>
                    <Button variant="outline" colorPalette="blue" size="sm" onClick={() => downloadMusicHex(result.audio, result.format, result.id)}>
                      Download MP3
                    </Button>
                  </Box>
                  <AudioPlayer hex={result.audio} format={result.format} onDownload={() => downloadMusicHex(result.audio, result.format, result.id)} />
                </Box>

                <Box display="grid" gap={2} gridTemplateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}>
                  <Box border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white" p="0.75rem">
                    <Box color="gray.500" fontSize="xs">Mode</Box>
                    <Box fontWeight={700}>{instrumental ? 'Instrumental' : 'Vocal'}</Box>
                  </Box>
                  <Box border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white" p="0.75rem">
                    <Box color="gray.500" fontSize="xs">Model</Box>
                    <Box fontWeight={700}>{model}</Box>
                  </Box>
                  <Box border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white" p="0.75rem">
                    <Box color="gray.500" fontSize="xs">Bitrate</Box>
                    <Box fontWeight={700}>{Math.round((result.metadata.bitrate ?? DEFAULT_BITRATE) / 1000)} kbps</Box>
                  </Box>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
