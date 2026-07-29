'use client';

/**
 * VoiceDesigner — prompt textarea with example suggestions,
 * preview player for trial audio, accept/regenerate buttons, TTL warning.
 */

import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authFetch, parseApiError } from '@/lib/auth-client';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { TTLCounter } from '@/components/shared/TTLCounter';
import { AudioPlayer } from '@/components/tts/AudioPlayer';
import { saveHistoryItem } from '@/lib/history';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';

interface VoiceDesignerProps {
  onAccept?: (voice: VoiceDTO) => void;
  initialPrompt?: string;
  initialPreviewText?: string;
}

const MAX_PROMPT_CHARS = 2000;
const MAX_PREVIEW_CHARS = 500;
const DESIGN_TTL_MS = 168 * 60 * 60 * 1000;

const EXAMPLE_PROMPTS = [
  'A calm, professional female voice with a slight British accent',
  'Warm male voice with an American Southern accent',
  'Cheerful young female voice with a slight Spanish accent',
  'Deep, authoritative male voice with a neutral American accent',
  'Friendly female voice with an Australian accent',
];

export function VoiceDesigner({
  onAccept,
  initialPrompt = '',
  initialPreviewText = '',
}: VoiceDesignerProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [previewText, setPreviewText] = useState(initialPreviewText);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: number | null; message: string | null } | null>(null);
  const [previewResult, setPreviewResult] = useState<{ voice: VoiceDTO; trialAudioUrl?: string; trialAudio?: string } | null>(
    null
  );
  const [savedVoice, setSavedVoice] = useState<VoiceDTO | null>(null);

  const handleDesign = async () => {
    if (!prompt.trim()) {
      setError({ code: null, message: 'Please enter a prompt.' });
      return;
    }
    if (!previewText.trim()) {
      setError({ code: null, message: 'Please enter preview text.' });
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await authFetch('/api/minimax/voices/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), previewText: previewText.trim() }),
      });

      if (!response.ok) {
        const err = await parseApiError(response);
        setError({ code: err?.code ?? response.status, message: err?.message ?? `HTTP ${response.status}` });
        return;
      }

      const data = await response.json();
      setPreviewResult(data);
    } catch {
      setError({ code: null, message: 'Failed to design voice. Check your connection.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (previewResult) {
      setSavedVoice(previewResult.voice);
      setPreviewResult(null);
      const voice = previewResult.voice;
      saveHistoryItem({
        type: 'design',
        voiceId: voice.voiceId,
        ttlExpiry: voice.ttlExpiry ?? Date.now() + DESIGN_TTL_MS,
      });
      if (onAccept) {
        onAccept(voice);
      }
    }
  };

  const handleRegenerate = () => {
    setPreviewResult(null);
    handleDesign();
  };

  const addExamplePrompt = (example: string) => {
    setPrompt((prev) => (prev ? `${prev} ${example}` : example).slice(0, MAX_PROMPT_CHARS));
  };

  const ttlExpiry = savedVoice?.ttlExpiry ?? Date.now() + DESIGN_TTL_MS;

  return (
    <Box display="grid" gap={6}>
      {/* Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Prompt</CardTitle>
          <CardDescription>
            Describe the voice you want in natural language.
          </CardDescription>
        </CardHeader>
        <CardContent display="grid" gap={3}>
          <Box display="grid" gap={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Label htmlFor="designer-prompt">Prompt</Label>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {prompt.length}/{MAX_PROMPT_CHARS}
              </span>
            </Box>
            <Textarea
              id="designer-prompt"
              placeholder="e.g. A calm, professional female voice with a slight British accent, speaking at a moderate pace..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_CHARS))}
              minH="6rem"
              disabled={isLoading || !!previewResult}
            />
          </Box>

          {/* Example suggestions */}
          <Box display="flex" flexWrap="wrap" gap={1}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Examples:</span>
            {EXAMPLE_PROMPTS.map((example) => (
              <Badge
                key={example}
                variant="outline"
                style={{ fontSize: '0.75rem', cursor: 'pointer' }}
                onClick={() => addExamplePrompt(example)}
              >
                {example.split(' ').slice(0, 3).join(' ')}...
              </Badge>
            ))}
          </Box>

          {/* Preview Text */}
          <Box display="grid" gap={2}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Label htmlFor="designer-preview-text">Preview Text</Label>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {previewText.length}/{MAX_PREVIEW_CHARS}
              </span>
            </Box>
            <Textarea
              id="designer-preview-text"
              placeholder="e.g. Hello, welcome to the world of synthetic voices."
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value.slice(0, MAX_PREVIEW_CHARS))}
              minH="4rem"
              disabled={isLoading || !!previewResult}
            />
          </Box>

          {error && <ErrorDisplay code={error.code} message={error.message} />}

          <Button
            onClick={handleDesign}
            disabled={isLoading || !!previewResult || !!savedVoice}
          >
            {isLoading ? 'Designing...' : 'Design Voice'}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Player */}
      {previewResult && (
        <Card>
          <CardHeader>
            <CardTitle>Voice Preview</CardTitle>
            <CardDescription>
              Listen to the trial audio. Accept to save or regenerate for a new version.
            </CardDescription>
          </CardHeader>
          <CardContent display="grid" gap={4}>
            <Box display="grid" gap={2}>
              <Label>Voice ID</Label>
              <code style={{ fontSize: '0.875rem', backgroundColor: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                {previewResult.voice.voiceId}
              </code>
            </Box>

            {previewResult.trialAudio && (
              <Box display="grid" gap={2}>
                <Label>Preview Audio (hex)</Label>
                <AudioPlayer hex={previewResult.trialAudio} format="mp3" />
              </Box>
            )}

            {previewResult.trialAudioUrl && !previewResult.trialAudio && (
              <Box display="grid" gap={2}>
                <Label>Preview Audio</Label>
                <audio controls src={previewResult.trialAudioUrl} style={{ width: '100%' }} />
              </Box>
            )}

            <Box display="flex" gap={2}>
              <Button onClick={handleAccept} disabled={isLoading}>
                Accept & Save
              </Button>
              <Button variant="outline" onClick={handleRegenerate} disabled={isLoading}>
                Regenerate
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Saved Voice */}
      {savedVoice && (
        <Card>
          <CardHeader>
            <CardTitle>Voice Saved</CardTitle>
            <CardDescription>
              Your designed voice is ready. Use voice ID{' '}
              <code style={{ fontSize: '0.75rem', backgroundColor: '#f3f4f6', padding: '0 0.25rem', borderRadius: '0.25rem' }}>{savedVoice.voiceId}</code> in Text to Speech.
            </CardDescription>
          </CardHeader>
          <CardContent display="grid" gap={4}>
            <Box display="flex" alignItems="center" gap={2}>
              <TTLCounter expiresAt={ttlExpiry} label="Voice TTL" />
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Expires after 7 days of inactivity.
              </span>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
