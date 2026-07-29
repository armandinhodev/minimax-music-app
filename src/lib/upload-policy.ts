import { FILE_PURPOSE_OPTIONS, type FilePurpose } from '@/application/dto/FileDTO';

export const MAX_UPLOAD_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_FILE_SIZE_MB = 20;
export const MAX_MULTIPART_OVERHEAD_BYTES = 256 * 1024;

export const VOICE_UPLOAD_DURATION_LIMITS = {
  minSeconds: 10,
  maxSeconds: 300,
} as const;

export interface UploadPurposePolicy {
  allowedExtensions: readonly string[];
  allowedMimeHints: readonly string[];
}

export const UPLOAD_POLICY_BY_PURPOSE: Record<FilePurpose, UploadPurposePolicy> = {
  voice_clone: {
    allowedExtensions: ['.mp3', '.m4a', '.wav'],
    allowedMimeHints: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a'],
  },
  prompt_audio: {
    allowedExtensions: ['.mp3', '.m4a', '.wav'],
    allowedMimeHints: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a'],
  },
  t2a_async_input: {
    allowedExtensions: ['.txt', '.zip'],
    allowedMimeHints: ['text/plain', 'application/zip', 'application/x-zip-compressed'],
  },
  t2a_async: {
    allowedExtensions: [],
    allowedMimeHints: [],
  },
};

export const VOICE_UPLOAD_POLICY = UPLOAD_POLICY_BY_PURPOSE.voice_clone;

export const ALL_UPLOAD_PURPOSES = FILE_PURPOSE_OPTIONS;
