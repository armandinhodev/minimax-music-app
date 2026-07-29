'use client';

/**
 * Voice clone workflow page.
 * Steps: upload audio, set voice_id, submit clone request.
 * Shows TTL countdown badge after successful clone.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch, parseApiError } from '@/lib/auth-client';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { TTLCounter } from '@/components/shared/TTLCounter';
import { VoiceUpload } from '@/components/voice/VoiceUpload';
import { saveHistoryItem } from '@/lib/history';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';
import { MAX_UPLOAD_FILE_SIZE_MB, VOICE_UPLOAD_DURATION_LIMITS } from '@/lib/upload-policy';

// TTL for cloned voices: 168 hours (7 days) from MiniMax
const CLONE_TTL_MS = 168 * 60 * 60 * 1000;

export default function CloneVoicePage() {
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code: number | null; message: string | null; details?: { upstreamStatus?: number; upstreamMessage?: string } } | null>(null);
  const [clonedVoice, setClonedVoice] = useState<VoiceDTO | null>(null);

  const handleFileSelected = (_file: File) => {
    setUploadedFileId(null);
    setClonedVoice(null);
    setError(null);
  };

  const handleUploadComplete = (fileId: string) => {
    setUploadedFileId(fileId);
    setError(null);
  };

  const handleClone = async () => {
    if (!uploadedFileId) {
      setError({ code: null, message: 'Please upload an audio file first.' });
      return;
    }
    if (!voiceId.trim()) {
      setError({ code: null, message: 'Please enter a voice ID.' });
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await authFetch('/api/minimax/voices/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: uploadedFileId, voiceId: voiceId.trim() }),
      });

      if (!response.ok) {
        const err = await parseApiError(response);
        setError({
          code: err?.code ?? response.status,
          message: err?.message ?? `HTTP ${response.status}`,
          details: err?.details,
        });
        return;
      }

      const data = await response.json();
      setClonedVoice(data.voice);
      saveHistoryItem({ type: 'clone', voiceId: data.voice.voiceId, fileId: uploadedFileId });
    } catch {
      setError({ code: null, message: 'Failed to clone voice. Check your connection.' });
    } finally {
      setIsLoading(false);
    }
  };

  const ttlExpiry = clonedVoice?.ttlExpiry ?? Date.now() + CLONE_TTL_MS;

  return (
    <Box display="grid" gap={6} maxW="36rem">
      <Box>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Clone a Voice</h1>
        <Box color="gray.600" mt={1}>
          Upload an audio sample ({VOICE_UPLOAD_DURATION_LIMITS.minSeconds}s–{VOICE_UPLOAD_DURATION_LIMITS.maxSeconds / 60}min, MP3/M4A/WAV, ≤{MAX_UPLOAD_FILE_SIZE_MB} MB) to create a voice clone.
        </Box>
      </Box>

      <Card>
        <CardHeader>
          <CardTitle>Voice Clone</CardTitle>
          <CardDescription>
            Upload a clean audio sample with clear speech. The clone will be ready shortly after generation.
          </CardDescription>
        </CardHeader>
        <CardContent display="grid" gap={4}>
          <VoiceUpload onFileSelected={handleFileSelected} onUploadComplete={handleUploadComplete} />

          {/* Voice ID */}
          <Box display="grid" gap={2}>
            <Label htmlFor="voice-id">Voice ID</Label>
            <Input
              id="voice-id"
              placeholder="e.g. my-clone-voice-1"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              maxLength={256}
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              A unique identifier for your voice (8–256 chars, starts with a letter).
            </p>
          </Box>

          {error && <ErrorDisplay code={error.code} message={error.message} details={error.details} />}

          <Box display="flex" gap={2}>
            <Button onClick={handleClone} disabled={isLoading || !uploadedFileId}>
              {isLoading ? 'Cloning...' : 'Clone Voice'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Success State */}
      {clonedVoice && (
        <Card>
          <CardHeader>
            <CardTitle>Voice Cloned Successfully</CardTitle>
            <CardDescription>
              Your voice clone is ready. Use the voice ID <code style={{ fontSize: '0.75rem', backgroundColor: '#f3f4f6', padding: '0 0.25rem', borderRadius: '0.25rem' }}>{clonedVoice.voiceId}</code> in Text to Speech.
            </CardDescription>
          </CardHeader>
          <CardContent display="grid" gap={4}>
            <Box display="flex" alignItems="center" gap={2}>
              <TTLCounter expiresAt={ttlExpiry} label="Voice TTL" />
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Your cloned voice will expire after 7 days of inactivity.
              </span>
            </Box>
            <Box display="flex" gap={2}>
              <Link
                href="/tts"
                style={{ display: 'inline-flex', height: '2rem', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', borderRadius: '0.5rem', border: '1px solid transparent', backgroundColor: '#111827', padding: '0 0.75rem', fontSize: '0.875rem', fontWeight: 500, color: 'white' }}
              >
                Go to Text to Speech
              </Link>
              <Link
                href="/voices"
                style={{ display: 'inline-flex', height: '2rem', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', backgroundColor: 'white', padding: '0 0.75rem', fontSize: '0.875rem' }}
              >
                View All Voices
              </Link>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
