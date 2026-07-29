/**
 * DesignVoice use case — generate a voice from a natural-language prompt.
 * Returns the designed voice and trial audio hex for preview playback.
 */

import type { IMiniMaxSpeechClient } from '@/domain/interfaces/IMiniMaxSpeechClient';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';
import { DesignVoiceSchema } from '@/application/dto/VoiceDTO';

export class DesignVoiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DesignVoiceValidationError';
  }
}

export class DesignVoiceUseCase {
  constructor(private readonly speechClient: IMiniMaxSpeechClient) {}

  /**
   * Execute voice design workflow.
   *
   * @throws DesignVoiceValidationError — invalid input (prompt >2 000 chars, preview_text >500 chars)
   * @throws Error                       — MiniMax API errors
   */
  async execute(request: {
    prompt: string;
    previewText: string;
  }): Promise<{ voice: VoiceDTO; trialAudio?: string }> {
    const parsed = DesignVoiceSchema.safeParse(request);
    if (!parsed.success) {
      throw new DesignVoiceValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; ')
      );
    }

    const voiceResult = await this.speechClient.designVoice(parsed.data.prompt, parsed.data.previewText);

    // designVoice returns a Voice with ttlExpiry set (168-hour TTL) + trialAudioHex
    return {
      voice: {
        voiceId: voiceResult.voiceId,
        name: voiceResult.name,
        type: voiceResult.type,
        ttlExpiry: voiceResult.ttlExpiry,
        createdAt: voiceResult.createdAt,
      },
      // trialAudio: base64-decoded hex for AudioPlayer playback
      trialAudio: voiceResult.trialAudioHex,
    };
  }
}
