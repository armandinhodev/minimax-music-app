import type { LibraryGenerationDTO } from '@/application/dto/LibraryDTO';
import type { IGenerationRepository } from '@/domain/interfaces/IGenerationRepository';

export class ListLibraryGenerationsUseCase {
  constructor(private readonly repository: IGenerationRepository) {}

  execute(limit = 50): LibraryGenerationDTO[] {
    return this.repository.listRecentGenerations(limit);
  }
}
