'use client';

/**
 * Text-to-Speech page.
 * UI: text input, voice selector, format/speed/pitch controls, generate button, copy/download.
 */

import { useCallback, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, type SelectOption } from '@/components/ui/select';
import { authFetch, parseApiError } from '@/lib/auth-client';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { TextInput } from '@/components/tts/TextInput';
import { VoiceSelector } from '@/components/tts/VoiceSelector';
import { AudioPlayer } from '@/components/tts/AudioPlayer';
import { StreamingPlayer } from '@/components/tts/StreamingPlayer';
import { saveHistoryItem } from '@/lib/history';
import { storeAudioFromHex } from '@/lib/audio-storage';
import { DEFAULT_T2A_FORMAT, DEFAULT_T2A_MODEL } from '@/domain/value-objects/T2APolicy';

const MODEL_OPTIONS: SelectOption[] = [
  { value: 'speech-2.8-hd', label: 'speech-2.8-hd' },
  { value: 'speech-2.8', label: 'speech-2.8' },
  { value: 'speech-01', label: 'speech-01' },
];

const FORMAT_OPTIONS: SelectOption[] = [
  { value: 'mp3', label: 'MP3' },
  { value: 'pcm', label: 'PCM' },
  { value: 'flac', label: 'FLAC' },
  { value: 'wav', label: 'WAV' },
  { value: 'opus', label: 'Opus' },
];

export default function TTSPage() {
  const [generateText, setGenerateText] = useState('');
  const [generateVoiceId, setGenerateVoiceId] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [streamingVoiceId, setStreamingVoiceId] = useState('');
  const [model, setModel] = useState(DEFAULT_T2A_MODEL);
  const [format, setFormat] = useState(DEFAULT_T2A_FORMAT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: number | null; message: string | null } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioHex, setAudioHex] = useState<string | null>(null);
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const handleModelChange = useCallback((value: string) => {
    setModel(value as typeof model);
  }, []);

  const handleFormatChange = useCallback((value: string) => {
    setFormat(value as typeof format);
  }, []);

  const handleGenerate = async () => {
    if (!generateText.trim()) {
      setError({ code: null, message: 'Please enter some text.' });
      return;
    }
    if (generateText.length > 10000) {
      setError({ code: null, message: 'Text exceeds 10,000 characters.' });
      return;
    }
    if (!generateVoiceId.trim()) {
      setError({ code: null, message: 'Please select a voice.' });
      return;
    }

    setError(null);
    setActionStatus(null);
    setIsLoading(true);
    setAudioUrl(null);
    setAudioHex(null);

    try {
      const response = await authFetch('/api/minimax/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: generateText, voiceId: generateVoiceId, model, format }),
      });

      if (!response.ok) {
        const err = await parseApiError(response);
        setError({ code: err?.code ?? response.status, message: err?.message ?? `HTTP ${response.status}` });
        return;
      }

      const data = await response.json();

      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        saveHistoryItem({ type: 'tts', text: generateText, voiceId: generateVoiceId, audioUrl: data.audioUrl, format });
        setActionStatus('Audio generated and saved to Library as a temporary URL. Download it soon because provider URLs can expire.');
      } else if (data.audio) {
        setAudioHex(data.audio);
        let audioStorageKey: string | undefined;
        try {
          audioStorageKey = await storeAudioFromHex(data.audio, format);
        } catch {
          audioStorageKey = undefined;
        }
        saveHistoryItem({ type: 'tts', text: generateText, voiceId: generateVoiceId, audioStorageKey, format });
        setActionStatus(
          audioStorageKey
            ? 'Audio generated, stored locally in this browser, and saved to Library.'
            : 'Audio generated for preview, but browser storage was unavailable. This Library item may not be downloadable after refresh.'
        );
      }
    } catch {
      setError({ code: null, message: 'Failed to generate audio. Check your connection.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box display="grid" gap={6} maxW="42rem">
      <Box>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Text to Speech</h1>
        <Box color="gray.600" mt={1}>
          Convert text to natural-sounding audio using MiniMax TTS. Generate Audio creates a reusable Library item; Streaming TTS is immediate playback only.
        </Box>
      </Box>

      <Card accent="green">
        <CardHeader>
          <CardTitle>Generate Audio</CardTitle>
          <CardDescription>
            Creates audio you can download now and find later in Library when local storage or a temporary URL is available.
          </CardDescription>
        </CardHeader>
        <CardContent display="grid" gap={4}>
          <Box border="1px solid" borderColor="green.100" borderLeft="3px solid" borderLeftColor="green.400" borderRadius="md" bg="white" p="0.75rem" color="gray.700" fontSize="sm">
            Best for finished clips, exports, and anything you want to keep in your browser Library.
          </Box>
          {/* Text Input — Phase 6 component */}
          <TextInput
            value={generateText}
            onChange={setGenerateText}
            id="tts-text"
            label="Text"
            disabled={isLoading}
          />

          {/* Voice Selector — Phase 6 component */}
          <VoiceSelector
            value={generateVoiceId}
            onChange={setGenerateVoiceId}
            label="Voice"
            disabled={isLoading}
          />

          {/* Model & Format */}
          <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={4}>
            <Box display="grid" gap={2}>
              <Label>Model</Label>
              <Select
                value={model}
                onValueChange={handleModelChange}
                options={MODEL_OPTIONS}
              />
            </Box>
            <Box display="grid" gap={2}>
              <Label>Format</Label>
              <Select
                value={format}
                onValueChange={handleFormatChange}
                options={FORMAT_OPTIONS}
              />
            </Box>
          </Box>

          {error && <ErrorDisplay code={error.code ?? null} message={error.message ?? ''} />}
          {actionStatus && !error && (
            <Box border="1px solid" borderColor="green.100" borderLeft="3px solid" borderLeftColor="green.400" borderRadius="md" bg="white" p="0.75rem" color="green.800" fontSize="sm">
              {actionStatus}
            </Box>
          )}

          <Box display="flex" gap={2}>
            <Button onClick={handleGenerate} disabled={isLoading} colorPalette="green">
              {isLoading ? 'Generating...' : 'Generate'}
            </Button>
            {audioUrl && (
              <Button
                variant="outline"
                colorPalette="blue"
                onClick={() => window.open(audioUrl, '_blank')}
              >
                Download
              </Button>
            )}
          </Box>

          {/* Audio Preview — Phase 6 AudioPlayer component */}
          {audioHex && (
            <Box display="grid" gap={2}>
              <Label>Preview</Label>
              <AudioPlayer hex={audioHex} format={format} />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Streaming TTS — Phase 6 StreamingPlayer component */}
      <Card accent="teal">
        <CardHeader>
          <CardTitle>Streaming TTS</CardTitle>
          <CardDescription>
            Plays audio immediately while it is generated. Streaming playback is not saved to Library.
          </CardDescription>
        </CardHeader>
        <CardContent display="grid" gap={4}>
          <Box border="1px solid" borderColor="teal.100" borderLeft="3px solid" borderLeftColor="teal.400" borderRadius="md" bg="white" p="0.75rem" color="gray.700" fontSize="sm">
            Best for fast previews and live playback. Use Generate Audio when you need a downloadable Library item.
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Label htmlFor="streaming-toggle" style={{ fontSize: '0.875rem' }}>Enable Streaming</Label>
            <Button
              id="streaming-toggle"
              variant={streamingEnabled ? 'default' : 'outline'}
              colorPalette={streamingEnabled ? 'green' : 'gray'}
              size="sm"
              onClick={() => setStreamingEnabled((prev) => !prev)}
            >
              {streamingEnabled ? 'On' : 'Off'}
            </Button>
          </Box>
          {streamingEnabled && (
            <>
              <TextInput
                value={streamingText}
                onChange={setStreamingText}
                id="stream-text"
                label="Streaming Text"
                disabled={isLoading}
              />
              <VoiceSelector
                value={streamingVoiceId}
                onChange={setStreamingVoiceId}
                label="Streaming Voice"
                disabled={isLoading}
              />
              <StreamingPlayer
                text={streamingText}
                voiceId={streamingVoiceId}
                model={model}
                enabled={streamingEnabled}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
