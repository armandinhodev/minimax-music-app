import { z } from 'zod';

export const DEFAULT_MUSIC_MODEL = 'music-3.0' as const;
export const DEFAULT_MUSIC_FORMAT = 'mp3' as const;
export const DEFAULT_MUSIC_SAMPLE_RATE = 44100 as const;
export const DEFAULT_MUSIC_BITRATE = 256000 as const;

export const MusicModelSchema = z.enum(['music-3.0', 'music-3.0-free']);
export const MusicOutputFormatSchema = z.literal('hex');
export const MusicAudioFormatSchema = z.literal(DEFAULT_MUSIC_FORMAT);

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
