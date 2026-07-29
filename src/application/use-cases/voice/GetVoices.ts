/**
 * GetVoices use case — list all system and user-owned voices.
 */

import type { IMiniMaxSpeechClient } from '@/domain/interfaces/IMiniMaxSpeechClient';
import type { VoiceDTO } from '@/application/dto/VoiceDTO';

export class GetVoicesUseCase {
  constructor(private readonly speechClient: IMiniMaxSpeechClient) {}

  /**
   * Execute get voices — returns all system + user voices.
   *
   * @throws Error — MiniMax API errors
   */
  async execute(): Promise<VoiceDTO[]> {
    const voices = await this.speechClient.getVoices();

    return voices.map((v) => ({
      voiceId: v.voiceId,
      name: v.name,
      type: v.type,
      ttlExpiry: v.ttlExpiry,
      createdAt: v.createdAt,
    }));
  }
}
