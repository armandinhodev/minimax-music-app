import { z } from 'zod';

/**
 * VoiceId value object — validates MiniMax voice_id format.
 * 8–256 chars, must start with a letter, no trailing dash/underscore.
 */
export const VoiceIdSchema = z
  .string()
  .min(8, 'voice_id must be at least 8 characters')
  .max(256, 'voice_id must be at most 256 characters')
  .regex(/^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9]$/, 'voice_id must start with a letter and not end with dash or underscore');

export type VoiceId = z.infer<typeof VoiceIdSchema>;
