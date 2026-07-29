/**
 * DeleteVoice use case — delete a user-owned voice by voice_id.
 */

import type { IMiniMaxSpeechClient } from '@/domain/interfaces/IMiniMaxSpeechClient';
import { DeleteVoiceSchema } from '@/lib/validators';
import type { VoiceId } from '@/domain/value-objects/VoiceId';

export class DeleteVoiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeleteVoiceValidationError';
  }
}

export class DeleteVoiceUseCase {
  constructor(private readonly speechClient: IMiniMaxSpeechClient) {}

  /**
   * Execute delete voice.
   *
   * @throws DeleteVoiceValidationError — invalid voice_id
   * @throws Error                        — MiniMax API errors
   */
  async execute(request: {
    voiceId: string;
    voiceType?: 'voice_cloning' | 'voice_generation';
  }): Promise<void> {
    const parsed = DeleteVoiceSchema.safeParse(request);
    if (!parsed.success) {
      throw new DeleteVoiceValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; ')
      );
    }

    const { voiceId, voiceType = 'voice_cloning' } = parsed.data;

    await this.speechClient.deleteVoice(voiceId as VoiceId, voiceType);
  }
}
