import type { GenerateImageRequest, GenerateImageResponse } from '@/application/dto/ImageDTO';

/**
 * Port interface for MiniMax image generation operations.
 * Implementations are server-only and must never be bundled for the browser.
 */
export interface IMiniMaxImageClient {
  generateImage(request: GenerateImageRequest): Promise<GenerateImageResponse>;
}
