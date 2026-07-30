import type { GenerateImageRequest, GenerateImageResponse } from '@/application/dto/ImageDTO';
import { GenerateImageSchema } from '@/application/dto/ImageDTO';
import type { IMiniMaxImageClient } from '@/domain/interfaces/IMiniMaxImageClient';

export class GenerateImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerateImageValidationError';
  }
}

export class GenerateImageUseCase {
  constructor(private readonly imageClient: IMiniMaxImageClient) {}

  async execute(request: GenerateImageRequest): Promise<GenerateImageResponse> {
    const parsed = GenerateImageSchema.safeParse(request);
    if (!parsed.success) {
      throw new GenerateImageValidationError(parsed.error.issues.map((issue) => issue.message).join('; '));
    }

    return this.imageClient.generateImage(parsed.data);
  }
}
