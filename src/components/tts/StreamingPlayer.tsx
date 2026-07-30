'use client';

/**
 * StreamingPlayer buffers the complete base64-encoded MP3 SSE stream before decoding once.
 * This avoids attempting to decode incomplete MP3 frames and avoids replacing active sources.
 */

import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_T2A_MODEL } from '@/domain/value-objects/T2APolicy';

interface StreamingPlayerProps {
  text: string;
  voiceId: string;
  model?: string;
  enabled: boolean;
}

type StreamState = 'idle' | 'connecting' | 'streaming' | 'paused' | 'done' | 'error';

export type StreamChunkParseResult =
  | { kind: 'audio'; bytes: Uint8Array }
  | { kind: 'ignore' }
  | { kind: 'error'; reason: string };

export function base64ToUint8Array(value: string): Uint8Array {
  const binary = atob(value.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function parseStreamingAudioPayload(data: string): StreamChunkParseResult {
  const trimmed = data.trim();
  if (!trimmed || trimmed === '[DONE]') return { kind: 'ignore' };

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const audio = parsed.audio ?? parsed.base64 ?? parsed.data;
    if (typeof audio !== 'string' || audio.trim() === '') return { kind: 'ignore' };
    return { kind: 'audio', bytes: base64ToUint8Array(audio) };
  } catch {
    return { kind: 'error', reason: 'Invalid streaming audio payload.' };
  }
}

export function shouldFailCompletedStream(hadFatalChunkError: boolean, playedAnyAudio: boolean): boolean {
  return hadFatalChunkError || !playedAnyAudio;
}

export class NonRetryableStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableStreamError';
  }
}

export function shouldRetryStreamFailure(error: unknown): boolean {
  return !(error instanceof NonRetryableStreamError);
}

export const StreamingPlayer = memo(function StreamingPlayer({ text, voiceId, model = DEFAULT_T2A_MODEL, enabled }: StreamingPlayerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const chunksRef = useRef<Uint8Array[]>([]);
  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [chunksReceived, setChunksReceived] = useState(0);
  const [webAudioSupported, setWebAudioSupported] = useState(true);
  const [totalBytes, setTotalBytes] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  useEffect(() => {
    try {
      const ctx = new AudioContext();
      setWebAudioSupported(true);
      ctx.close();
    } catch {
      setWebAudioSupported(false);
    }
  }, []);

  const stopCurrentPlayback = useCallback(() => {
    if (!sourceRef.current) return;
    try { sourceRef.current.stop(); } catch (_err) { /* source may already be stopped */ }
    sourceRef.current.disconnect();
    sourceRef.current = null;
  }, []);

  const initAudioContext = useCallback(() => {
    if (!webAudioSupported) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    return audioContextRef.current;
  }, [webAudioSupported]);

  const playAccumulated = useCallback(async (ctx: AudioContext): Promise<boolean> => {
    if (chunksRef.current.length === 0) return false;
    const totalLen = chunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunksRef.current) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    try {
      const audioBuffer = await ctx.decodeAudioData(combined.buffer);
      stopCurrentPlayback();
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
      sourceRef.current = source;
      chunksRef.current = [];
      return true;
    } catch {
      return false;
    }
  }, [stopCurrentPlayback]);

  const streamChunks = useCallback(async () => {
    if (!text || !voiceId || !enabled) return;
    const ctx = initAudioContext();
    if (!ctx) {
      setErrorMessage('Web Audio API not supported.');
      setStreamState('error');
      return;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    setStreamState('connecting');
    setErrorMessage(null);
    chunksRef.current = [];
    setChunksReceived(0);
    setTotalBytes(0);

    try {
      const response = await fetch('/api/minimax/tts/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('app_access_key') ?? ''}`,
        },
        body: JSON.stringify({ text, voiceId, model }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setStreamState('streaming');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buffer = '';
      let hadFatalChunkError = false;
      let playedAnyAudio = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const parsedChunk = parseStreamingAudioPayload(line.slice(5).trim());
          if (parsedChunk.kind === 'error') { hadFatalChunkError = true; continue; }
          if (parsedChunk.kind === 'audio') {
            chunksRef.current.push(parsedChunk.bytes);
            setTotalBytes((prev) => prev + parsedChunk.bytes.length);
            setChunksReceived((prev) => prev + 1);
          }
        }
      }
      if (chunksRef.current.length > 0) playedAnyAudio = await playAccumulated(ctx);
      if (shouldFailCompletedStream(hadFatalChunkError, playedAnyAudio)) {
        throw new NonRetryableStreamError('Streaming audio payload could not be decoded.');
      }
      reconnectAttemptsRef.current = 0;
      setStreamState('done');
    } catch (err) {
      if ((err as Error).name === 'AbortError') { setStreamState('idle'); return; }
      if (shouldRetryStreamFailure(err) && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 8000);
        setStreamState('connecting');
        reconnectTimeoutRef.current = setTimeout(() => { void streamChunks(); }, delay);
      } else {
        setStreamState('error');
        setErrorMessage('Stream failed after multiple attempts.');
      }
    }
  }, [text, voiceId, model, enabled, initAudioContext, playAccumulated]);

  const handleStart = () => { void streamChunks(); };
  const handleStop = () => {
    abortControllerRef.current?.abort();
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    stopCurrentPlayback();
    setStreamState('idle');
    chunksRef.current = [];
    setChunksReceived(0);
  };

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    stopCurrentPlayback();
    void audioContextRef.current?.close();
  }, [stopCurrentPlayback]);

  if (!webAudioSupported) return <Box display="grid" gap={2}><p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Web Audio API is not supported. Streaming audio is unavailable.</p></Box>;

  return (
    <Box display="grid" gap={3}>
      {errorMessage && <p style={{ fontSize: '0.875rem', color: '#dc2626' }}>{errorMessage}</p>}
      <Box display="flex" alignItems="center" gap={2}>
        {streamState === 'idle' || streamState === 'error' ? <Button variant="outline" size="sm" onClick={handleStart} disabled={!enabled || !text || !voiceId}>Start Stream</Button> : streamState === 'streaming' || streamState === 'connecting' ? <Button variant="outline" size="sm" onClick={handleStop}>Stop</Button> : null}
        <Badge variant="outline" style={{ fontSize: '0.75rem' }}>
          {streamState === 'idle' && 'Ready'}{streamState === 'connecting' && 'Connecting...'}{streamState === 'streaming' && `Streaming (${chunksReceived} chunks)`}{streamState === 'paused' && 'Paused'}{streamState === 'done' && 'Done'}{streamState === 'error' && 'Error'}
        </Badge>
        {streamState === 'streaming' && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{totalBytes > 0 ? `${(totalBytes / 1024).toFixed(1)} KB received` : 'Receiving...'}</span>}
      </Box>
    </Box>
  );
});
