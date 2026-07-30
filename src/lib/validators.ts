/**
 * Shared Zod validators for all inbound API request DTOs.
 * Route Handlers parse incoming JSON with these schemas.
 * Named exports — one schema per DTO.
 */

import { z } from 'zod';

import { FilePurposeSchema, ListFilesSchema, UploadFileSchema } from '@/application/dto/FileDTO';
import {
  GenerateImageSchema,
  type GenerateImageRequest,
} from '@/application/dto/ImageDTO';
import {
  SynthesizeT2ASchema,
  StreamT2ASchema,
  SubmitAsyncT2ASchema,
  type StreamT2ARequest,
  type SubmitAsyncT2ARequest,
  type SynthesizeT2ARequest,
} from '@/application/dto/T2ADTO';
import { VoiceIdSchema } from '@/domain/value-objects/VoiceId';
export { CloneVoiceSchema, DesignVoiceSchema } from '@/application/dto/VoiceDTO';
export { UploadFileSchema } from '@/application/dto/FileDTO';
import { CloneVoiceSchema, DesignVoiceSchema } from '@/application/dto/VoiceDTO';

export const T2ARequestSchema = SynthesizeT2ASchema;
export type T2ARequest = SynthesizeT2ARequest;

export const T2AStreamRequestSchema = StreamT2ASchema;
export type T2AStreamRequest = StreamT2ARequest;

export const AsyncT2ASubmitSchema = SubmitAsyncT2ASchema;
export type AsyncT2ASubmit = SubmitAsyncT2ARequest;

export const GenerateImageRequestSchema = GenerateImageSchema;
export type GenerateImage = GenerateImageRequest;

export const ListFilesRequestSchema = ListFilesSchema;
export type ListFilesRequest = z.infer<typeof ListFilesSchema>;

/**
 * Clone Voice Request.
 * fileId: MiniMax file_id from uploaded audio (10s–5min, ≤20 MB, mp3/m4a/wav).
 * voiceId: user-chosen identifier (8–256 chars, letter-prefixed).
 * optionalClonePrompt: optional { prompt_audio: file_id, prompt_text: string }
 * optionalPreviewText: optional short text to preview the clone
 * optionalModel: optional model for preview
 */
export type CloneVoice = z.infer<typeof CloneVoiceSchema>;

/**
 * Design Voice Request.
 * prompt: natural language description of the desired voice.
 * previewText: short text (≤500 chars) used to generate trial audio.
 */
export type DesignVoice = z.infer<typeof DesignVoiceSchema>;

/**
 * Upload File — purpose only (file content comes as FormData, not JSON).
 */
export type UploadFile = z.infer<typeof UploadFileSchema>;

/**
 * Get Voices — POST /v1/get_voice with voice_type filter.
 * voice_type: 'system' | 'voice_cloning' | 'voice_generation' | 'all'
 */
export const GetVoicesSchema = z.object({
  voiceType: z.enum(['system', 'voice_cloning', 'voice_generation', 'all']).default('all'),
});

export type GetVoices = z.infer<typeof GetVoicesSchema>;

/**
 * Delete Voice — request body.
 * voice_type: 'voice_cloning' | 'voice_generation'
 */
export const DeleteVoiceSchema = z.object({
  voiceId: VoiceIdSchema,
  voiceType: z.enum(['voice_cloning', 'voice_generation']).default('voice_cloning'),
});

export type DeleteVoice = z.infer<typeof DeleteVoiceSchema>;

/**
 * Get File — request body.
 */
export const GetFileSchema = z.object({
  fileId: z.string().min(1, 'fileId is required'),
});

export type GetFile = z.infer<typeof GetFileSchema>;

/**
 * Delete File — request body.
 */
export const DeleteFileSchema = z.object({
  fileId: z.string().min(1, 'fileId is required'),
  purpose: FilePurposeSchema,
});

export type DeleteFile = z.infer<typeof DeleteFileSchema>;
