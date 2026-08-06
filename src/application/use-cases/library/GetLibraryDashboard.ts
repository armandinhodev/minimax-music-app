import type { LibrarySummaryDTO } from '@/application/dto/LibraryDTO';
import type { IGenerationRepository } from '@/domain/interfaces/IGenerationRepository';

export class GetLibraryDashboardUseCase {
  constructor(private readonly repository: IGenerationRepository) {}

  execute(limit = 6): LibrarySummaryDTO {
    return this.repository.getDashboardSummary(limit);
  }
}
