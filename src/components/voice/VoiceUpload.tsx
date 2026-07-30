'use client';

/**
 * VoiceUpload — audio file upload with drag-and-drop, waveform preview,
 * and duration validation (10s–5min, ≤20MB, mp3/m4a/wav).
 */

import { useCallback, useRef, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { authFetch, parseApiError } from '@/lib/auth-client';
import {
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_FILE_SIZE_MB,
  VOICE_UPLOAD_DURATION_LIMITS,
  VOICE_UPLOAD_POLICY,
} from '@/lib/upload-policy';

interface VoiceUploadProps {
  onFileSelected?: (file: File) => void;
  onUploadComplete?: (fileId: string, file: File) => void;
  disabled?: boolean;
}

const ALLOWED_TYPES = new Set(VOICE_UPLOAD_POLICY.allowedMimeHints);
const FILE_ACCEPT_HINT = [
  ...VOICE_UPLOAD_POLICY.allowedExtensions,
  ...VOICE_UPLOAD_POLICY.allowedMimeHints,
].join(',');

function getRetryHint(retryable?: boolean, retryAfterSeconds?: number | null): string | null {
  if (!retryable) {
    return null;
  }

  if (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
    return `Retry available in about ${retryAfterSeconds} seconds.`;
  }

  return 'This upload can be retried.';
}

export function VoiceUpload({ onFileSelected, onUploadComplete, disabled = false }: VoiceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<{
    message: string;
    upstreamStatus?: number;
    upstreamMessage?: string;
  } | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [isValidatingDuration, setIsValidatingDuration] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    async (f: File): Promise<{ valid: boolean; error?: string; duration?: number }> => {
      // Check type
        if (!ALLOWED_TYPES.has(f.type)) {
          return {
            valid: false,
            error: `Invalid file type "${f.type}". Use MP3, M4A, or WAV.`,
        };
      }

      // Check size
        if (f.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
          return {
            valid: false,
            error: `File too large (${(f.size / 1024 / 1024).toFixed(2)} MB). Maximum is ${MAX_UPLOAD_FILE_SIZE_MB} MB.`,
          };
        }

      // Check duration
      setIsValidatingDuration(true);
      try {
        const audio = new Audio();
        audio.src = URL.createObjectURL(f);

        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => resolve();
          audio.onerror = () => reject(new Error('Could not read audio metadata'));
          // Timeout after 30s
          setTimeout(() => reject(new Error('Audio metadata load timeout')), 30000);
        });

        const dur = audio.duration;
        URL.revokeObjectURL(audio.src);

        if (!isFinite(dur)) {
          return { valid: false, error: 'Could not determine audio duration.' };
        }
        if (dur < VOICE_UPLOAD_DURATION_LIMITS.minSeconds) {
          return {
            valid: false,
            error: `Audio too short (${dur.toFixed(1)}s). Minimum is ${VOICE_UPLOAD_DURATION_LIMITS.minSeconds}s.`,
          };
        }
        if (dur > VOICE_UPLOAD_DURATION_LIMITS.maxSeconds) {
          return {
            valid: false,
            error: `Audio too long (${dur.toFixed(1)}s). Maximum is ${VOICE_UPLOAD_DURATION_LIMITS.maxSeconds / 60} minutes.`,
          };
        }

        return { valid: true, duration: dur };
      } catch (e) {
        return {
          valid: false,
          error: `Could not validate audio duration: ${(e as Error).message}`,
        };
      } finally {
        setIsValidatingDuration(false);
      }
    },
    []
  );

  const extractWaveform = useCallback(async (f: File): Promise<number[]> => {
    try {
      const arrayBuffer = await f.arrayBuffer();
      // Simple amplitude extraction from audio data
      // Use AudioContext for proper waveform
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);

      // Downsample to ~100 points
      const samples = 100;
      const blockSize = Math.floor(channelData.length / samples);
      const waveform: number[] = [];

      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        waveform.push(sum / blockSize);
      }

      // Normalize
      const max = Math.max(...waveform);
      await audioContext.close();
      return max > 0 ? waveform.map((v) => v / max) : waveform;
    } catch {
      return [];
    }
  }, []);

  const handleFile = useCallback(
    async (f: File) => {
      setError(null);
      setDuration(null);
      setWaveformData([]);
      setUploadedFileId(null);

      const validation = await validateFile(f);
      if (!validation.valid) {
        setError({ message: validation.error ?? 'Invalid file.' });
        setFile(null);
        return;
      }

      setFile(f);
      setDuration(validation.duration ?? null);

      // Extract waveform
      const waveform = await extractWaveform(f);
      setWaveformData(waveform);

      if (onFileSelected) {
        onFileSelected(f);
      }
    },
    [validateFile, extractWaveform, onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [disabled, handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const uploadFile = useCallback(
    async (f: File): Promise<string | null> => {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', f);
        formData.append('purpose', 'voice_clone');

        const response = await authFetch('/api/minimax/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await parseApiError(response);
          const retryHint = getRetryHint(err?.retryable, err?.retryAfterSeconds);
          const messageParts = [err?.message ?? `Upload failed (HTTP ${response.status})`, retryHint].filter(Boolean);
          setError({
            message: messageParts.join(' '),
            upstreamStatus: err?.details?.upstreamStatus,
            upstreamMessage: err?.details?.upstreamMessage,
          });
          return null;
        }

        setUploadProgress(100);
         const data = await response.json();
         const fileId = data.fileId ?? data.file?.fileId ?? data.id;
         setUploadedFileId(fileId);
         if (fileId) {
           onUploadComplete?.(fileId, f);
         }
         return fileId;
      } catch {
        setError({ message: 'Upload failed. Check your connection.' });
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete]
  );

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Box display="grid" gap={3}>
      {/* Drop zone */}
      <Box
        border="2px dashed"
        borderColor={isDragging ? '#16a34a' : '#86efac'}
        borderRadius="lg"
        p={6}
        textAlign="center"
        transition="border-color 0.2s"
        bg={isDragging ? 'green.50' : 'white'}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_ACCEPT_HINT}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        {!file ? (
          <Box display="grid" gap={2}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Drag and drop an audio file, or{' '}
              <button
                type="button"
                style={{ color: '#166534', textDecorationLine: 'underline', textUnderlineOffset: '4px', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isValidatingDuration}
              >
                browse
              </button>
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              MP3, M4A, WAV — {VOICE_UPLOAD_DURATION_LIMITS.minSeconds}s to {VOICE_UPLOAD_DURATION_LIMITS.maxSeconds / 60}min — up to {MAX_UPLOAD_FILE_SIZE_MB} MB
            </p>
          </Box>
        ) : (
          <Box display="grid" gap={2} alignItems="center">
            <p style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
              {duration !== null && ` — ${formatDuration(duration)}`}
            </p>
          </Box>
        )}

        {isValidatingDuration && (
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>Validating duration...</p>
        )}
      </Box>

      {/* Waveform preview */}
      {waveformData.length > 0 && (
        <Box display="grid" gap={1}>
          <Label style={{ fontSize: '0.75rem' }}>Waveform Preview</Label>
          <Box display="flex" alignItems="flex-end" gap="1px" h={48}>
            {waveformData.map((amplitude, i) => (
              <Box
                key={i}
                flex={1}
                bg="rgba(17, 24, 39, 0.6)"
                borderRadius="2px"
                style={{ height: `${Math.max(4, amplitude * 48)}px` }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Upload progress */}
      {isUploading && <Progress value={uploadProgress} w="full" />}

      {/* Error */}
      {error && (
        <Box>
          <p style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error.message}</p>
          {(error.upstreamStatus !== undefined || error.upstreamMessage) && (
            <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', opacity: 0.85 }}>
              {error.upstreamStatus !== undefined && (
                <>Upstream HTTP {error.upstreamStatus}. </>
              )}
              {error.upstreamMessage && (
                <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0 0.25rem', borderRadius: '0.25rem' }}>
                  {error.upstreamMessage}
                </code>
              )}
            </p>
          )}
        </Box>
      )}

      {/* Actions */}
      {file && !uploadedFileId && (
        <Box display="flex" gap={2}>
          <Button
            variant="outline"
            colorPalette="blue"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading || isValidatingDuration}
          >
            Change File
          </Button>
          <Button
            size="sm"
            colorPalette="green"
            onClick={() => uploadFile(file)}
            disabled={disabled || isUploading || isValidatingDuration || !!uploadedFileId}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </Box>
      )}

      {uploadedFileId && (
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Uploaded — file_id: <code style={{ backgroundColor: '#f3f4f6', padding: '0 0.25rem', borderRadius: '0.25rem' }}>{uploadedFileId}</code>
        </p>
      )}
    </Box>
  );
}
