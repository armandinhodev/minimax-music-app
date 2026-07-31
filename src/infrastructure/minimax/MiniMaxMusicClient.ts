/**
 * MiniMax Music HTTP client.
 * Server-only: never imported from client-side code.
 * @server-only
 */

import 'server-only';

import {
  DEFAULT_MUSIC_BITRATE,
  DEFAULT_MUSIC_FORMAT,
  DEFAULT_MUSIC_MODEL,
  DEFAULT_MUSIC_SAMPLE_RATE,
  MUSIC_COVER_MODEL,
  normalizeMusicCoverAudioBase64,
  type GenerateLyricsRequest,
  type GenerateLyricsResponse,
  type GenerateMusicRequest,
  type GenerateMusicResponse,
  type MusicCoverPreprocessRequest,
  type MusicCoverPreprocessResponse,
} from '@/application/dto/MusicDTO';
import {
  buildAuthHeader,
  MINIMAX_BASE_URL,
  parseMiniMaxApplicationError,
  parseMiniMaxError,
  requireMiniMaxApiKey,
  type MiniMaxApiError,
} from './MiniMaxConfig';
import { readResponseBodyOnce } from './retry-utils';

export class MiniMaxMusicError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'MiniMaxMusicError';
  }
}

const FETCH_TIMEOUT_MS = 60_000;

function normalizeError(apiError: MiniMaxApiError): MiniMaxMusicError {
  return new MiniMaxMusicError(apiError.message, apiError.code, apiError.status, apiError.retryAfterSeconds);
}

function mapRequestBody(request: GenerateMusicRequest) {
  const audioSetting = request.audioSetting ?? {
    sampleRate: DEFAULT_MUSIC_SAMPLE_RATE,
    bitrate: DEFAULT_MUSIC_BITRATE,
    format: DEFAULT_MUSIC_FORMAT,
  };

  return {
    model: request.model ?? DEFAULT_MUSIC_MODEL,
    ...(request.prompt?.trim() ? { prompt: request.prompt.trim() } : {}),
    ...(request.instrumental ? {} : { lyrics: request.lyrics?.trim() ?? '' }),
    stream: false,
    output_format: request.outputFormat ?? 'hex',
    audio_setting: {
      sample_rate: audioSetting.sampleRate,
      bitrate: audioSetting.bitrate,
      format: audioSetting.format,
    },
  };
}

function musicDurationMsToSeconds(durationMs?: number): number | undefined {
  if (durationMs === undefined) return undefined;
  return durationMs / 1000;
}

function normalizeStyleTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

function mapLyricsRequestBody(request: GenerateLyricsRequest) {
  return {
    mode: request.mode,
    ...(request.prompt?.trim() ? { prompt: request.prompt.trim() } : {}),
    ...(request.lyrics?.trim() ? { lyrics: request.lyrics.trim() } : {}),
    ...(request.title?.trim() ? { title: request.title.trim() } : {}),
  };
}

function mapCoverPreprocessRequestBody(request: MusicCoverPreprocessRequest) {
  return {
    model: request.model ?? MUSIC_COVER_MODEL,
    ...(request.audioUrl?.trim() ? { audio_url: request.audioUrl.trim() } : {}),
    ...(request.audioBase64?.trim() ? { audio_base64: normalizeMusicCoverAudioBase64(request.audioBase64) } : {}),
  };
}

export class MiniMaxMusicClient {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = requireMiniMaxApiKey();
  }

  async generateMusic(request: GenerateMusicRequest): Promise<GenerateMusicResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(`${MINIMAX_BASE_URL}/v1/music_generation`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: buildAuthHeader(this.apiKey),
        },
        body: JSON.stringify(mapRequestBody(request)),
      });

      if (!response.ok) {
        const body = await readResponseBodyOnce(response);
        throw normalizeError(parseMiniMaxError(response, body));
      }

      const data = await response.json() as MiniMaxMusicGenerationResponse;
      if (data?.base_resp && typeof data.base_resp.status_code === 'number' && data.base_resp.status_code !== 0) {
        throw normalizeError(parseMiniMaxApplicationError(response.status, data.base_resp));
      }

      const audio = data.data?.audio;
      if (typeof audio !== 'string' || audio.trim().length === 0) {
        throw new MiniMaxMusicError('MiniMax returned no music audio', 0, 502);
      }

      return {
        id: data.trace_id?.trim() || crypto.randomUUID(),
        audio,
        format: DEFAULT_MUSIC_FORMAT,
        metadata: {
          status: data.data?.status,
          traceId: data.trace_id,
          durationSeconds: musicDurationMsToSeconds(data.extra_info?.music_duration),
          sampleRate: data.extra_info?.music_sample_rate,
          channels: data.extra_info?.music_channel,
          bitrate: data.extra_info?.bitrate,
          sizeBytes: data.extra_info?.music_size,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new MiniMaxMusicError('Request timed out', 0, 408);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateLyrics(request: GenerateLyricsRequest): Promise<GenerateLyricsResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(`${MINIMAX_BASE_URL}/v1/lyrics_generation`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: buildAuthHeader(this.apiKey),
        },
        body: JSON.stringify(mapLyricsRequestBody(request)),
      });

      if (!response.ok) {
        const body = await readResponseBodyOnce(response);
        throw normalizeError(parseMiniMaxError(response, body));
      }

      const data = await response.json() as MiniMaxLyricsGenerationResponse;
      if (data?.base_resp && typeof data.base_resp.status_code === 'number' && data.base_resp.status_code !== 0) {
        throw normalizeError(parseMiniMaxApplicationError(response.status, data.base_resp));
      }

      if (typeof data.lyrics !== 'string' || data.lyrics.trim().length === 0) {
        throw new MiniMaxMusicError('MiniMax returned no lyrics', 0, 502);
      }

      return {
        songTitle: typeof data.song_title === 'string' ? data.song_title : '',
        styleTags: normalizeStyleTags(data.style_tags),
        lyrics: data.lyrics,
        metadata: {
          status: data.base_resp?.status_code,
          message: data.base_resp?.status_msg,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new MiniMaxMusicError('Request timed out', 0, 408);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async preprocessMusicCover(request: MusicCoverPreprocessRequest): Promise<MusicCoverPreprocessResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(`${MINIMAX_BASE_URL}/v1/music_cover_preprocess`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: buildAuthHeader(this.apiKey),
        },
        body: JSON.stringify(mapCoverPreprocessRequestBody(request)),
      });

      if (!response.ok) {
        const body = await readResponseBodyOnce(response);
        throw normalizeError(parseMiniMaxError(response, body));
      }

      const data = await response.json() as MiniMaxMusicCoverPreprocessResponse;
      if (data?.base_resp && typeof data.base_resp.status_code === 'number' && data.base_resp.status_code !== 0) {
        throw normalizeError(parseMiniMaxApplicationError(response.status, data.base_resp));
      }

      if (typeof data.cover_feature_id !== 'string' || data.cover_feature_id.trim().length === 0) {
        throw new MiniMaxMusicError('MiniMax returned no cover feature ID', 0, 502);
      }

      return {
        coverFeatureId: data.cover_feature_id,
        formattedLyrics: data.formatted_lyrics ?? '',
        structureResult: data.structure_result ?? '',
        audioDurationSeconds: data.audio_duration ?? 0,
        traceId: data.trace_id,
        metadata: {
          status: data.base_resp?.status_code,
          message: data.base_resp?.status_msg,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new MiniMaxMusicError('Request timed out', 0, 408);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

interface MiniMaxMusicGenerationResponse {
  data?: {
    audio?: string;
    status?: string | number;
  };
  trace_id?: string;
  extra_info?: {
    music_duration?: number;
    music_sample_rate?: number;
    music_channel?: number;
    bitrate?: number;
    music_size?: number;
  };
  base_resp?: {
    status_code: number;
    status_msg?: string;
  };
}

interface MiniMaxLyricsGenerationResponse {
  song_title?: string;
  style_tags?: unknown;
  lyrics?: string;
  base_resp?: {
    status_code: number;
    status_msg?: string;
  };
}

interface MiniMaxMusicCoverPreprocessResponse {
  cover_feature_id?: string;
  formatted_lyrics?: string;
  structure_result?: string;
  audio_duration?: number;
  trace_id?: string;
  base_resp?: {
    status_code: number;
    status_msg?: string;
  };
}
