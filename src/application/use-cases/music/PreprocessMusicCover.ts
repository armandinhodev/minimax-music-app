import type { MusicCoverPreprocessRequest, MusicCoverPreprocessResponse } from '@/application/dto/MusicDTO';
import { MusicCoverPreprocessSchema } from '@/application/dto/MusicDTO';
import type { IMiniMaxMusicClient } from '@/domain/interfaces/IMiniMaxMusicClient';

export class PreprocessMusicCoverValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreprocessMusicCoverValidationError';
  }
}

export class PreprocessMusicCoverUseCase {
  constructor(private readonly musicClient: IMiniMaxMusicClient) {}

  async execute(request: MusicCoverPreprocessRequest): Promise<MusicCoverPreprocessResponse> {
    const parsed = MusicCoverPreprocessSchema.safeParse(request);
    if (!parsed.success) {
      throw new PreprocessMusicCoverValidationError(parsed.error.issues.map((issue) => issue.message).join('; '));
    }

    return this.musicClient.preprocessMusicCover(parsed.data);
  }
}
