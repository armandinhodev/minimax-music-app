import { z } from 'zod';
import { VoiceIdSchema } from '@/domain/value-objects/VoiceId';
import { AudioFormatSchema } from '@/domain/value-objects/AudioFormat';
import { DEFAULT_T2A_FORMAT, DEFAULT_T2A_MODEL } from '@/domain/value-objects/T2APolicy';

/**
 * T2A Request DTO — sync synthesis, ≤10 000 chars.
 * Default model is speech-2.8-hd for quality.
 */
export const SynthesizeT2ASchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(10000, 'Text must be at most 10 000 characters'),
  voiceId: VoiceIdSchema,
  model: z.string().default(DEFAULT_T2A_MODEL),
  format: AudioFormatSchema.default(DEFAULT_T2A_FORMAT),
});

export type SynthesizeT2ARequest = z.infer<typeof SynthesizeT2ASchema>;

export interface SynthesizeT2AResponse {
  audio?: string; // hex-encoded audio
  audioUrl?: string; // download URL (when MiniMax returns a URL instead of hex)
}

/**
 * T2A Stream Request DTO.
 */
export const StreamT2ASchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(10000, 'Text must be at most 10 000 characters'),
  voiceId: VoiceIdSchema,
  model: z.string().default(DEFAULT_T2A_MODEL),
});

export type StreamT2ARequest = z.infer<typeof StreamT2ASchema>;

/**
 * Async T2A Submit Request DTO — for texts >10 000 chars.
 */
export const SubmitAsyncT2ASchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(1000000, 'Text must be at most 1 000 000 characters'),
  voiceId: VoiceIdSchema,
  model: z.string().default(DEFAULT_T2A_MODEL),
  format: AudioFormatSchema.default(DEFAULT_T2A_FORMAT),
});

export type SubmitAsyncT2ARequest = z.infer<typeof SubmitAsyncT2ASchema>;

/**
 * Async T2A Poll Response DTO.
 */
export interface PollAsyncT2AResponse {
  status: 'processing' | 'success' | 'failed' | 'expired';
  fileId?: string;
  taskId: string;
}
