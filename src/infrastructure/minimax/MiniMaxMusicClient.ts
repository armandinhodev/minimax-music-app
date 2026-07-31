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
  type GenerateMusicRequest,
  type GenerateMusicResponse,
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
