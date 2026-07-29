import { z } from 'zod';

/**
 * AudioFormat value object — supported MiniMax audio output formats.
 */
export const AudioFormatSchema = z.enum([
  'mp3',
  'pcm',
  'flac',
  'wav',
  'pcmu_raw',
  'pcmu_wav',
  'opus',
]);

export type AudioFormat = z.infer<typeof AudioFormatSchema>;
