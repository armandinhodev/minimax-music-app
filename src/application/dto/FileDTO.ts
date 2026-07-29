import { z } from 'zod';

/**
 * File Purpose enum schema.
 */
export const FilePurposeSchema = z.enum([
  'voice_clone',
  'prompt_audio',
  't2a_async_input',
  't2a_async',
]);

export type FilePurpose = z.infer<typeof FilePurposeSchema>;

/**
 * Upload File Request DTO.
 * file: multipart file content (sent as FormData, not JSON).
 * purpose: MiniMax file purpose.
 */
export const UploadFileSchema = z.object({
  purpose: FilePurposeSchema,
});

export type UploadFileRequest = z.infer<typeof UploadFileSchema>;

/**
 * List Files Request DTO.
 */
export const ListFilesSchema = z.object({
  purpose: FilePurposeSchema.optional(),
});

export type ListFilesRequest = z.infer<typeof ListFilesSchema>;

/**
 * File Metadata DTO — returned to clients.
 */
export interface FileMetadataDTO {
  fileId: string;
  fileName: string;
  purpose: FilePurpose;
  size: number;
  createdAt: number;
}

/**
 * Get File Response DTO — includes a fresh download URL (may expire).
 */
export interface GetFileResponse {
  file: FileMetadataDTO;
  downloadUrl: string;
  expiresAt: number; // Unix timestamp ms
}

export const FILE_PURPOSE_OPTIONS = FilePurposeSchema.options;
