'use client';

import { useState, type ChangeEvent } from 'react';
import { Box } from '@chakra-ui/react';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { authFetch, parseApiError } from '@/lib/auth-client';

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/flac',
  'audio/x-flac',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
]);
const ALLOWED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg']);

interface CoverPreprocessResult {
  coverFeatureId: string;
  formattedLyrics: string;
  structureResult: string;
  audioDurationSeconds: number;
  traceId?: string;
  metadata: {
    status?: number;
    message?: string;
  };
}

interface SelectedAudioFile {
  name: string;
  size: number;
  base64: string;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getFileExtension(name: string): string {
  const lastDot = name.lastIndexOf('.');
  return lastDot >= 0 ? name.toLowerCase().slice(lastDot) : '';
}

function validateAudioFile(file: File): string | null {
  const extension = getFileExtension(file.name);
  if (file.size > MAX_AUDIO_BYTES) {
    return `Reference audio must be at most 50 MB. Selected file is ${formatBytes(file.size)}.`;
  }
  if (file.type && !ALLOWED_AUDIO_MIME_TYPES.has(file.type)) {
    return 'Reference audio must be a common audio format such as MP3, WAV, FLAC, M4A, AAC, or OGG.';
  }
  if (!file.type && !ALLOWED_AUDIO_EXTENSIONS.has(extension)) {
    return 'Reference audio must use a supported extension: MP3, WAV, FLAC, M4A, AAC, or OGG.';
  }
  return null;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      resolve(value.includes(',') ? value.slice(value.indexOf(',') + 1) : value);
    };
    reader.onerror = () => reject(new Error('Failed to read reference audio'));
    reader.readAsDataURL(file);
  });
}

export default function MusicCoverPreprocessPage() {
  const [audioUrl, setAudioUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<SelectedAudioFile | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: number | null; message: string | null } | null>(null);
  const [result, setResult] = useState<CoverPreprocessResult | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const hasAudioUrl = audioUrl.trim().length > 0;
  const hasFile = selectedFile !== null;
  const validationMessage = (() => {
    if (hasAudioUrl && hasFile) return 'Use either a reference audio URL or a local upload, not both.';
    if (!hasAudioUrl && !hasFile) return 'Provide one reference audio source before preprocessing.';
    return null;
  })();
  const canPreprocess = !isLoading && !isReadingFile && validationMessage === null;

  const handleAudioFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    setResult(null);
    setActionStatus(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateAudioFile(file);
    if (validationError) {
      setSelectedFile(null);
      setError({ code: null, message: validationError });
      event.currentTarget.value = '';
      return;
    }

    setError(null);
    setIsReadingFile(true);
    try {
      const base64 = await readFileAsBase64(file);
      setSelectedFile({ name: file.name, size: file.size, base64 });
    } catch {
      setSelectedFile(null);
      setError({ code: null, message: 'Could not read the reference audio. Choose another file and try again.' });
    } finally {
      setIsReadingFile(false);
    }
  };

  const handlePreprocess = async () => {
    if (validationMessage) {
      setError({ code: null, message: validationMessage });
      return;
    }

    setError(null);
    setActionStatus(null);
    setIsLoading(true);
    setResult(null);

    try {
      const response = await authFetch('/api/minimax/music/cover-preprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'music-cover',
          audioUrl: hasAudioUrl ? audioUrl.trim() : '',
          audioBase64: selectedFile?.base64 ?? '',
        }),
      });

      if (!response.ok) {
        const err = await parseApiError(response);
        setError({ code: err?.code ?? response.status, message: err?.message ?? `HTTP ${response.status}` });
        return;
      }

      const data = await response.json() as CoverPreprocessResult;
      setResult(data);
      setActionStatus('Reference audio preprocessed. Use the cover feature ID within 24 hours for cover generation.');
    } catch {
      setError({ code: null, message: 'Failed to preprocess reference audio. Check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyFeatureId = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.coverFeatureId);
      setActionStatus('Cover feature ID copied to clipboard.');
    } catch {
      setActionStatus('Could not access the clipboard. Select the cover feature ID manually to copy it.');
    }
  };

  return (
    <Box display="grid" gap={6} width="100%">
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={4} flexWrap="wrap">
        <Box maxW="52rem">
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Cover Preprocess</h1>
          <Box color="gray.600" mt={1}>
            Prepare reference audio for MiniMax Music Cover and receive a 24-hour cover feature ID.
          </Box>
        </Box>
        <Box border="1px solid" borderColor="purple.100" borderLeft="3px solid" borderLeftColor="purple.400" borderRadius="md" bg="white" p="0.75rem" color="gray.700" fontSize="sm" maxW="24rem">
          Reference audio should be 6 seconds to 6 minutes, no larger than 50 MB, and in a common format like MP3, WAV, or FLAC.
        </Box>
      </Box>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', xl: 'minmax(0, 0.95fr) minmax(0, 1.15fr)' }} gap={6} alignItems="start">
        <Card accent="purple">
          <CardHeader>
            <CardTitle>Reference Audio</CardTitle>
            <CardDescription>Provide exactly one source: a hosted audio URL or a local audio upload converted to base64 in the browser.</CardDescription>
          </CardHeader>
          <CardContent display="grid" gap={4}>
            <Box display="grid" gap={2}>
              <Label htmlFor="cover-audio-url">Audio URL</Label>
              <Input id="cover-audio-url" value={audioUrl} disabled={isLoading || isReadingFile} placeholder="https://example.com/reference.wav" onChange={(event) => setAudioUrl(event.currentTarget.value)} />
              <Box color="gray.600" fontSize="sm">Use a public HTTP or HTTPS URL when your reference audio is already hosted.</Box>
            </Box>

            <Box display="grid" gap={2}>
              <Label htmlFor="cover-audio-file">Local audio upload</Label>
              <Input
                id="cover-audio-file"
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/flac,audio/mp4,audio/m4a,audio/aac,audio/ogg,.mp3,.wav,.flac,.m4a,.aac,.ogg"
                disabled={isLoading || isReadingFile}
                onChange={handleAudioFileChange}
              />
              <Box color="gray.600" fontSize="sm">The app sends the base64 payload to the server for this request only. It is not saved to Library or localStorage.</Box>
            </Box>

            {selectedFile && (
              <Box border="1px solid" borderColor="purple.100" borderRadius="lg" bg="white" p="0.75rem" display="flex" justifyContent="space-between" gap={2} flexWrap="wrap" color="gray.700" fontSize="sm">
                <span>{selectedFile.name}</span>
                <span>{formatBytes(selectedFile.size)}</span>
              </Box>
            )}

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

            <Button onClick={handlePreprocess} disabled={!canPreprocess} colorPalette="purple">
              {isLoading ? 'Preprocessing audio...' : isReadingFile ? 'Preparing upload...' : 'Preprocess Cover Audio'}
            </Button>
          </CardContent>
        </Card>

        <Card accent="green" minH="28rem">
          <CardHeader>
            <CardTitle>Preprocess Result</CardTitle>
            <CardDescription>{result ? `${Math.round(result.audioDurationSeconds)}s reference · valid for 24 hours` : 'Cover feature ID and MiniMax analysis appear here.'}</CardDescription>
          </CardHeader>
          <CardContent display="grid" gap={4}>
            {!result && !isLoading && (
              <Box border="1px dashed" borderColor="gray.200" borderRadius="xl" p="2rem" textAlign="center" color="gray.600" bg="white">
                Preprocess a reference track first. Full cover generation can use the returned cover feature ID in a follow-up workflow.
              </Box>
            )}
            {isLoading && (
              <Box border="1px dashed" borderColor="purple.200" borderRadius="xl" p="2rem" textAlign="center" color="gray.600" bg="white">
                Uploading and preprocessing reference audio. This billable POST is not retried automatically.
              </Box>
            )}
            {result && (
              <Box display="grid" gap={4}>
                <Box border="1px solid" borderColor="green.100" borderRadius="xl" bg="white" p="1rem" display="grid" gap={3}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
                    <Box>
                      <Box color="gray.500" fontSize="xs">Cover feature ID</Box>
                      <Box fontWeight={700} style={{ wordBreak: 'break-all' }}>{result.coverFeatureId}</Box>
                    </Box>
                    <Button variant="outline" colorPalette="blue" size="sm" onClick={handleCopyFeatureId}>Copy ID</Button>
                  </Box>
                  <Box color="gray.600" fontSize="sm">Trace: {result.traceId ?? 'not returned'} · Expires after 24 hours</Box>
                </Box>

                <Box display="grid" gap={2}>
                  <Label>Formatted lyrics</Label>
                  <Textarea value={result.formattedLyrics} readOnly minH="10rem" />
                </Box>

                <Box display="grid" gap={2}>
                  <Label>Structure result</Label>
                  <Box as="pre" whiteSpace="pre-wrap" border="1px solid" borderColor="green.100" borderRadius="xl" bg="white" p="1rem" color="gray.800" overflowX="auto">
                    {result.structureResult || 'No structure result returned'}
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
