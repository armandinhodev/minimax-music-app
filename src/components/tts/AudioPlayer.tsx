'use client';

/**
 * AudioPlayer — hex audio → Web Audio API playback.
 * Converts hex string to ArrayBuffer via Uint8Array.from(hex, 'hex'),
 * decodes with AudioContext.decodeAudioData, and plays via AudioBufferSourceNode.
 * Degrades gracefully if Web Audio API is unavailable.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

/**
 * Convert a hex string to an ArrayBuffer.
 * Each pair of hex characters represents one byte.
 */
export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const clean = hex.replace(/\s/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Convert a hex string to a Uint8Array.
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

interface AudioPlayerProps {
  hex: string;
  format?: string;
  onDownload?: (hex: string) => void;
}

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export function AudioPlayer({ hex, format = 'mp3', onDownload }: AudioPlayerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioDataRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseOffsetRef = useRef<number>(0);

  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [webAudioSupported, setWebAudioSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detect Web Audio API support
  useEffect(() => {
    try {
      const ctx = new AudioContext();
      setWebAudioSupported(true);
      ctx.close();
    } catch {
      setWebAudioSupported(false);
    }
  }, []);

  // Decode audio when hex changes
  useEffect(() => {
    if (!hex || !webAudioSupported) return;

    const decode = async () => {
      setPlaybackState('loading');
      setErrorMessage(null);
      try {
        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        const arrayBuffer = hexToArrayBuffer(hex);
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioDataRef.current = audioBuffer;
        setDuration(audioBuffer.duration);
        setPlaybackState('idle');
        setCurrentTime(0);
      } catch (_err) {
        setPlaybackState('error');
        setErrorMessage('Failed to decode audio data.');
      }
    };

    decode();

    return () => {
      stop();
      audioContextRef.current?.close();
    };
  }, [hex]);

  const stop = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // Already stopped
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }, []);

  const startPlayback = useCallback(
    (offset: number = 0) => {
      const ctx = audioContextRef.current;
      const buffer = audioDataRef.current;
      if (!ctx || !buffer) return;

      stop();

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0, offset);
      sourceRef.current = source;

      startTimeRef.current = ctx.currentTime - offset;
      setPlaybackState('playing');

      source.onended = () => {
        setPlaybackState('idle');
        setCurrentTime(0);
        pauseOffsetRef.current = 0;
      };
    },
    [stop]
  );

  const handlePlay = () => {
    if (!audioDataRef.current) return;
    startPlayback(pauseOffsetRef.current);
  };

  const handlePause = () => {
    const ctx = audioContextRef.current;
    if (!ctx || !sourceRef.current) return;

    pauseOffsetRef.current = ctx.currentTime - startTimeRef.current;
    stop();
    setPlaybackState('paused');
  };

  const handleSeek = (value: number | readonly number[]) => {
    const time = Array.isArray(value) ? value[0] : value;
    setCurrentTime(time);
    pauseOffsetRef.current = time;
    if (playbackState === 'playing') {
      startPlayback(time);
    }
  };

  const handleDownload = () => {
    if (!hex) return;
    if (onDownload) {
      onDownload(hex);
      return;
    }
    const blob = new Blob(
      [new Uint8Array(hexToArrayBuffer(hex))],
      { type: format === 'mp3' ? 'audio/mpeg' : `audio/${format}` }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Progress update
  useEffect(() => {
    if (playbackState !== 'playing') return;
    const id = setInterval(() => {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      setCurrentTime(Math.min(ctx.currentTime - startTimeRef.current, duration));
    }, 200);
    return () => clearInterval(id);
  }, [playbackState, duration]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!webAudioSupported) {
    return (
      <Box display="grid" gap={2}>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Web Audio API is not supported in this browser. Audio playback is unavailable.
        </p>
        <Button variant="outline" onClick={handleDownload} disabled={!hex}>
          Download Audio
        </Button>
      </Box>
    );
  }

  return (
    <Box display="grid" gap={3}>
      {playbackState === 'error' && (
        <p style={{ fontSize: '0.875rem', color: '#dc2626' }}>{errorMessage}</p>
      )}

      <Box display="flex" alignItems="center" gap={2}>
        {playbackState === 'playing' ? (
          <Button variant="outline" size="sm" onClick={handlePause}>
            Pause
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlay}
            disabled={playbackState === 'loading' || !audioDataRef.current}
          >
            {playbackState === 'loading' ? 'Loading...' : 'Play'}
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={handleDownload} disabled={!hex}>
          Download
        </Button>

        <Badge variant="outline" style={{ fontSize: '0.75rem' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Badge>
      </Box>

      {audioDataRef.current && (
        <Slider
          value={[currentTime]}
          min={0}
          max={duration}
          step={0.1}
          onValueChange={handleSeek}
          style={{ width: '100%' }}
        />
      )}
    </Box>
  );
}
