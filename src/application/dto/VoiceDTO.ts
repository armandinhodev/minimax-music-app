import { z } from 'zod';
import { VoiceIdSchema } from '@/domain/value-objects/VoiceId';

/**
 * Clone Voice Request DTO.
 * fileId: MiniMax file_id from uploaded audio (10s–5min, ≤20 MB, mp3/m4a/wav).
 * voiceId: user-chosen identifier (8–256 chars, letter-prefixed).
 * optionalClonePrompt: optional { prompt_audio: file_id, prompt_text: string }
 * optionalPreviewText: optional short text to preview the clone
 * optionalModel: optional model for preview
 *
 * NOTE: This schema is aligned with @/lib/validators CloneVoiceSchema.
 * Route Handlers should use @/lib/validators CloneVoiceSchema as the single
 * source of truth for inbound request parsing.
 */
export const CloneVoiceSchema = z.object({
  fileId: z.string().min(1, 'fileId is required'),
  voiceId: VoiceIdSchema,
  optionalClonePrompt: z.object({
    promptAudio: z.string().min(1),
    promptText: z.string().max(500).optional(),
  }).optional(),
  optionalPreviewText: z.string().max(500).optional(),
  optionalModel: z.string().optional(),
});

export type CloneVoiceRequest = z.infer<typeof CloneVoiceSchema>;

/**
 * Design Voice Request DTO.
 * prompt: natural language description of the desired voice.
 * previewText: short text (≤500 chars) used to generate trial audio.
 */
export const DesignVoiceSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000),
  previewText: z.string().min(1).max(500, 'Preview text must be at most 500 characters'),
});

export type DesignVoiceRequest = z.infer<typeof DesignVoiceSchema>;

/**
 * Voice DTO — returned to clients (never contains secrets).
 */
export interface VoiceDTO {
  voiceId: string;
  name: string;
  type: 'system' | 'clone' | 'design';
  ttlExpiry?: number; // Unix timestamp ms
  createdAt: number;
}

/**
 * Clone / Design response — includes the voice and optional trial audio (hex for AudioPlayer).
 */
export interface VoiceResponse {
  voice: VoiceDTO;
  trialAudioUrl?: string;
  trialAudio?: string; // hex-encoded audio for AudioPlayer
}

export type CloneVoiceSchemaShape = typeof CloneVoiceSchema;
export type DesignVoiceSchemaShape = typeof DesignVoiceSchema;
