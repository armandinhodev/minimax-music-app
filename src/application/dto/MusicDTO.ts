import { z } from 'zod';

export const DEFAULT_MUSIC_MODEL = 'music-3.0' as const;
export const DEFAULT_MUSIC_FORMAT = 'mp3' as const;
export const DEFAULT_MUSIC_SAMPLE_RATE = 44100 as const;
export const DEFAULT_MUSIC_BITRATE = 256000 as const;
export const MUSIC_COVER_MODEL = 'music-cover' as const;
export const MAX_MUSIC_COVER_AUDIO_BYTES = 50 * 1024 * 1024;

export const MusicModelSchema = z.enum(['music-3.0', 'music-3.0-free']);
export const MusicOutputFormatSchema = z.literal('hex');
export const MusicAudioFormatSchema = z.literal(DEFAULT_MUSIC_FORMAT);
export const LyricsGenerationModeSchema = z.enum(['write_full_song', 'edit']);

const AUDIO_DATA_URL_PATTERN = /^data:audio\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/]+={0,2})$/i;
const RAW_BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function getBase64Payload(value: string): string {
  const trimmed = value.trim();
  const dataUrlMatch = AUDIO_DATA_URL_PATTERN.exec(trimmed);
  return dataUrlMatch?.[1] ?? trimmed;
}

function getBase64ByteLength(value: string): number | null {
  const base64 = getBase64Payload(value);
  if (base64.length === 0 || base64.length % 4 !== 0 || !RAW_BASE64_PATTERN.test(base64)) return null;

  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeMusicCoverAudioBase64(value: string): string {
  return getBase64Payload(value);
}

export const MusicAudioSettingSchema = z.object({
  sampleRate: z.literal(DEFAULT_MUSIC_SAMPLE_RATE).default(DEFAULT_MUSIC_SAMPLE_RATE),
  bitrate: z.literal(DEFAULT_MUSIC_BITRATE).default(DEFAULT_MUSIC_BITRATE),
  format: MusicAudioFormatSchema.default(DEFAULT_MUSIC_FORMAT),
});

export const GenerateMusicSchema = z
  .object({
    model: MusicModelSchema.default(DEFAULT_MUSIC_MODEL),
    prompt: z
      .string()
      .trim()
      .max(2000, 'Prompt must be at most 2,000 characters')
      .optional()
      .default(''),
    lyrics: z
      .string()
      .trim()
      .max(3500, 'Lyrics must be at most 3,500 characters')
      .optional()
      .default(''),
    instrumental: z.boolean().default(false),
    stream: z.literal(false).default(false),
    outputFormat: MusicOutputFormatSchema.default('hex'),
    audioSetting: MusicAudioSettingSchema.default({
      sampleRate: DEFAULT_MUSIC_SAMPLE_RATE,
      bitrate: DEFAULT_MUSIC_BITRATE,
      format: DEFAULT_MUSIC_FORMAT,
    }),
  })
  .superRefine((value, ctx) => {
    if (value.instrumental) {
      if (value.prompt.trim().length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['prompt'],
          message: 'Prompt is required for instrumental music',
        });
      }
      return;
    }

    if (value.lyrics.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['lyrics'],
        message: 'Lyrics are required for vocal music',
      });
    }
  });

export type GenerateMusicRequest = z.infer<typeof GenerateMusicSchema>;

export interface GenerateMusicResponse {
  id: string;
  audio: string;
  format: typeof DEFAULT_MUSIC_FORMAT;
  metadata: {
    status?: string | number;
    traceId?: string;
    durationSeconds?: number;
    sampleRate?: number;
    channels?: number;
    bitrate?: number;
    sizeBytes?: number;
  };
}

export const GenerateLyricsSchema = z.object({
  mode: LyricsGenerationModeSchema,
  prompt: z
    .string()
    .trim()
    .max(2000, 'Prompt must be at most 2,000 characters')
    .optional()
    .default(''),
  lyrics: z
    .string()
    .trim()
    .max(3500, 'Lyrics must be at most 3,500 characters')
    .optional()
    .default(''),
  title: z.string().trim().max(200, 'Title must be at most 200 characters').optional().default(''),
});

export type GenerateLyricsRequest = z.infer<typeof GenerateLyricsSchema>;

export interface GenerateLyricsResponse {
  songTitle: string;
  styleTags: string[];
  lyrics: string;
  metadata: {
    status?: number;
    message?: string;
  };
}

export const MusicCoverPreprocessSchema = z
  .object({
    model: z.literal(MUSIC_COVER_MODEL).default(MUSIC_COVER_MODEL),
    audioUrl: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || isHttpUrl(value), 'Audio URL must be a valid HTTP or HTTPS URL')
      .optional()
      .default(''),
    audioBase64: z
      .string()
      .trim()
      .refine((value) => {
        if (value.length === 0) return true;
        return getBase64ByteLength(value) !== null;
      }, 'Audio upload must be a valid base64 audio payload')
      .refine((value) => {
        if (value.length === 0) return true;
        const byteLength = getBase64ByteLength(value);
        return byteLength !== null && byteLength <= MAX_MUSIC_COVER_AUDIO_BYTES;
      }, 'Audio upload must be at most 50 MB')
      .optional()
      .default(''),
  })
  .superRefine((value, ctx) => {
    const hasAudioUrl = value.audioUrl.trim().length > 0;
    const hasAudioBase64 = value.audioBase64.trim().length > 0;

    if (hasAudioUrl === hasAudioBase64) {
      ctx.addIssue({
        code: 'custom',
        path: ['audioUrl'],
        message: 'Provide exactly one reference audio source: URL or upload',
      });
    }
  });

export type MusicCoverPreprocessRequest = z.infer<typeof MusicCoverPreprocessSchema>;

export interface MusicCoverPreprocessResponse {
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
