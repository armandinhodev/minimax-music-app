/**
 * SynthesizeT2A use case — sync text-to-audio for texts ≤10,000 characters.
 * Maps error code 2038 → "Voice cloning requires account verification."
 */

import type { IMiniMaxSpeechClient } from '@/domain/interfaces/IMiniMaxSpeechClient';
import type { SynthesizeT2AResponse } from '@/application/dto/T2ADTO';
import { SynthesizeT2ASchema } from '@/application/dto/T2ADTO';
import { VoiceCloneNotVerifiedError } from '@/application/errors/VoiceCloneNotVerifiedError';
import type { T2ARequest } from '@/domain/value-objects/T2APolicy';

export class SynthesizeT2AValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SynthesizeT2AValidationError';
  }
}

export class SynthesizeT2AUseCase {
  constructor(private readonly speechClient: IMiniMaxSpeechClient) {}

  /**
   * Execute sync T2A synthesis.
   *
   * @throws SynthesizeT2AValidationError — text exceeds 10 000 characters
   * @throws VoiceCloneNotVerifiedError   — MiniMax account lacks voice clone permission (code 2038)
   * @throws Error                        — other MiniMax API errors
   */
  async execute(request: T2ARequest): Promise<SynthesizeT2AResponse> {
    // Validate input
    const parsed = SynthesizeT2ASchema.safeParse(request);
    if (!parsed.success) {
      throw new SynthesizeT2AValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; ')
      );
    }

    try {
      const audioOutput = await this.speechClient.synthesize(parsed.data);

      // MiniMax returns either hex audio or a download URL (not both)
      if (audioOutput.downloadUrl) {
        return {
          audioUrl: audioOutput.downloadUrl,
        };
      }

      // Carry hex audio when MiniMax returns it
      if (audioOutput.audioHex) {
        return {
          audio: audioOutput.audioHex,
        };
      }

       throw new Error('MiniMax returned no audio URL or audio payload.');
    } catch (error) {
      if (error instanceof VoiceCloneNotVerifiedError) {
        // Re-throw with the exact user-facing message for route handlers to surface
        throw error;
      }
      throw error;
    }
  }
}
