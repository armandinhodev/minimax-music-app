import type { GenerateMusicRequest, GenerateMusicResponse } from '@/application/dto/MusicDTO';
import { GenerateMusicSchema } from '@/application/dto/MusicDTO';
import type { IMiniMaxMusicClient } from '@/domain/interfaces/IMiniMaxMusicClient';

export class GenerateMusicValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerateMusicValidationError';
  }
}

export class GenerateMusicUseCase {
  constructor(private readonly musicClient: IMiniMaxMusicClient) {}

  async execute(request: GenerateMusicRequest): Promise<GenerateMusicResponse> {
    const parsed = GenerateMusicSchema.safeParse(request);
    if (!parsed.success) {
      throw new GenerateMusicValidationError(parsed.error.issues.map((issue) => issue.message).join('; '));
    }

    return this.musicClient.generateMusic(parsed.data);
  }
}
