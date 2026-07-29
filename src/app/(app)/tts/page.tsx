'use client';

/**
 * Text-to-Speech page.
 * UI: text input, voice selector, format/speed/pitch controls, generate button, copy/download.
 */

import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authFetch, parseApiError } from '@/lib/auth-client';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { TextInput } from '@/components/tts/TextInput';
import { VoiceSelector } from '@/components/tts/VoiceSelector';
import { AudioPlayer } from '@/components/tts/AudioPlayer';
import { StreamingPlayer } from '@/components/tts/StreamingPlayer';
import { saveHistoryItem } from '@/lib/history';
import { DEFAULT_T2A_FORMAT, DEFAULT_T2A_MODEL } from '@/domain/value-objects/T2APolicy';

const FORMAT_OPTIONS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'pcm', label: 'PCM' },
  { value: 'flac', label: 'FLAC' },
  { value: 'wav', label: 'WAV' },
  { value: 'opus', label: 'Opus' },
];

export default function TTSPage() {
  const [text, setText] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [model, setModel] = useState(DEFAULT_T2A_MODEL);
  const [format, setFormat] = useState(DEFAULT_T2A_FORMAT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: number | null; message: string | null } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioHex, setAudioHex] = useState<string | null>(null);
  const [streamingEnabled, setStreamingEnabled] = useState(false);

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError({ code: null, message: 'Please enter some text.' });
      return;
    }
    if (text.length > 10000) {
      setError({ code: null, message: 'Text exceeds 10,000 characters.' });
      return;
    }
    if (!voiceId.trim()) {
      setError({ code: null, message: 'Please select a voice.' });
      return;
    }

    setError(null);
    setIsLoading(true);
    setAudioUrl(null);
    setAudioHex(null);

    try {
      const response = await authFetch('/api/minimax/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId, model, format }),
      });

      if (!response.ok) {
        const err = await parseApiError(response);
        setError({ code: err?.code ?? response.status, message: err?.message ?? `HTTP ${response.status}` });
        return;
      }

      const data = await response.json();

      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        saveHistoryItem({ type: 'tts', text, voiceId, audioUrl: data.audioUrl });
      } else if (data.audio) {
        setAudioHex(data.audio);
        saveHistoryItem({ type: 'tts', text, voiceId });
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
          Convert text to natural-sounding audio using MiniMax TTS.
        </Box>
      </Box>

      <Card>
        <CardHeader>
          <CardTitle>Generate Audio</CardTitle>
          <CardDescription>
            Enter your text, choose a voice, and generate audio.
          </CardDescription>
        </CardHeader>
        <CardContent display="grid" gap={4}>
          {/* Text Input — Phase 6 component */}
          <TextInput
            value={text}
            onChange={setText}
            id="tts-text"
            label="Text"
            disabled={isLoading}
          />

          {/* Voice Selector — Phase 6 component */}
          <VoiceSelector
            value={voiceId}
            onChange={setVoiceId}
            label="Voice"
            disabled={isLoading}
          />

          {/* Model & Format */}
          <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={4}>
            <Box display="grid" gap={2}>
              <Label>Model</Label>
              <Select value={model} onValueChange={(v) => v && setModel(v as typeof model)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="speech-2.8-hd">speech-2.8-hd</SelectItem>
                  <SelectItem value="speech-2.8">speech-2.8</SelectItem>
                  <SelectItem value="speech-01">speech-01</SelectItem>
                </SelectContent>
              </Select>
            </Box>
            <Box display="grid" gap={2}>
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => v && setFormat(v as typeof format)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Box>
          </Box>

          {error && <ErrorDisplay code={error.code ?? null} message={error.message ?? ''} />}

          <Box display="flex" gap={2}>
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate'}
            </Button>
            {audioUrl && (
              <Button
                variant="outline"
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
      <Card>
        <CardHeader>
          <CardTitle>Streaming TTS</CardTitle>
          <CardDescription>
            Stream audio in real-time as it is generated.
          </CardDescription>
        </CardHeader>
        <CardContent display="grid" gap={4}>
          <Box display="flex" alignItems="center" gap={2}>
            <Label htmlFor="streaming-toggle" style={{ fontSize: '0.875rem' }}>Enable Streaming</Label>
            <Button
              id="streaming-toggle"
              variant={streamingEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStreamingEnabled((prev) => !prev)}
            >
              {streamingEnabled ? 'On' : 'Off'}
            </Button>
          </Box>
          {streamingEnabled && (
            <>
              <TextInput
                value={text}
                onChange={setText}
                id="stream-text"
                label="Streaming Text"
                disabled={isLoading}
              />
              <VoiceSelector
                value={voiceId}
                onChange={setVoiceId}
                label="Streaming Voice"
                disabled={isLoading}
              />
              <StreamingPlayer
                text={text}
                voiceId={voiceId}
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
