import type { GenerateMusicRequest, GenerateMusicResponse } from '@/application/dto/MusicDTO';

/**
 * Port interface for MiniMax music generation operations.
 * Implementations are server-only and must never be bundled for the browser.
 */
export interface IMiniMaxMusicClient {
  generateMusic(request: GenerateMusicRequest): Promise<GenerateMusicResponse>;
}
