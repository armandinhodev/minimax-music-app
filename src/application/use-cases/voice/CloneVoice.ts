/**
 * CloneVoice use case — upload audio file + clone voice workflow.
 * Maps error code 2038 → "Voice cloning requires account verification."
 *
 * Two workflows:
 * 1. Upload + clone: provide audioBuffer + fileName → uploads → clones
 * 2. Clone existing fileId: provide preUploadedFileId → skips upload → clones directly
 */

import type { IMiniMaxSpeechClient } from '@/domain/interfaces/IMiniMaxSpeechClient';
import type { IMiniMaxFileClient } from '@/domain/interfaces/IMiniMaxFileClient';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';
import { CloneVoiceSchema } from '@/lib/validators';
import { VoiceIdSchema } from '@/domain/value-objects/VoiceId';
import { VoiceCloneNotVerifiedError } from '@/application/errors/VoiceCloneNotVerifiedError';

export class CloneVoiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloneVoiceValidationError';
  }
}

export class CloneVoiceUseCase {
  constructor(
    private readonly speechClient: IMiniMaxSpeechClient,
    private readonly fileClient: IMiniMaxFileClient
  ) {}

  /**
   * Execute voice clone workflow.
   *
   * Upload + clone (fileId not provided):
   *   Step 1: Upload audio file (purpose: voice_clone) → file_id
   *   Step 2: POST /v1/voice_clone with file_id + user-chosen voice_id
   *
   * Clone existing fileId (preUploadedFileId provided):
   *   Skips upload; calls /v1/voice_clone directly with the existing file_id.
   *
   * @throws CloneVoiceValidationError   — invalid input
   * @throws VoiceCloneNotVerifiedError  — MiniMax account lacks voice clone permission (code 2038)
   * @throws Error                        — other MiniMax API errors
   */
  async execute(request: {
    audioBuffer: Buffer;
    fileName: string;
    voiceId: string;
    optionalClonePrompt?: { promptAudio: string; promptText?: string };
    optionalPreviewText?: string;
    optionalModel?: string;
    /** Pass preUploadedFileId to clone an already-uploaded file (skip upload step). */
    preUploadedFileId?: string;
  }): Promise<VoiceDTO> {
    // Validate voiceId
    const voiceIdParsed = VoiceIdSchema.safeParse(request.voiceId);
    if (!voiceIdParsed.success) {
      throw new CloneVoiceValidationError(
        voiceIdParsed.error.issues.map((e: { message: string }) => e.message).join('; ')
      );
    }

    let fileId: string;

    if (request.preUploadedFileId) {
      // Clone from already-uploaded file — skip upload step
      fileId = request.preUploadedFileId;
    } else {
      // Upload the audio file first
      const uploadedFile = await this.fileClient.uploadFile(
        request.audioBuffer,
        request.fileName,
        'voice_clone'
      );
      fileId = uploadedFile.fileId;
    }

    // Validate full schema with resolved fileId
    const parsed = CloneVoiceSchema.safeParse({
      fileId,
      voiceId: request.voiceId,
     optionalClonePrompt: request.optionalClonePrompt,
     optionalPreviewText: request.optionalPreviewText,
     optionalModel: request.optionalModel,
    });

    if (!parsed.success) {
      throw new CloneVoiceValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; ')
      );
    }

    try {
     const options = {
       optionalClonePrompt: request.optionalClonePrompt,
       optionalPreviewText: request.optionalPreviewText,
       optionalModel: request.optionalModel,
     };
     const hasOptions = Object.values(options).some((value) => value !== undefined);
     const voice = hasOptions
       ? await this.speechClient.cloneVoice(fileId, request.voiceId, options)
       : await this.speechClient.cloneVoice(fileId, request.voiceId);

      return {
        voiceId: voice.voiceId,
        name: voice.name,
        type: voice.type,
        ttlExpiry: voice.ttlExpiry,
        createdAt: voice.createdAt,
      };
    } catch (error) {
      if (error instanceof VoiceCloneNotVerifiedError) {
        throw error;
      }
      throw error;
    }
  }
}
