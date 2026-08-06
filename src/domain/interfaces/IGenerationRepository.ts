import type { CreateLibraryGenerationDTO, LibraryGenerationDTO, LibrarySummaryDTO } from '@/application/dto/LibraryDTO';

export interface IGenerationRepository {
  createGeneration(input: CreateLibraryGenerationDTO): LibraryGenerationDTO;
  getDashboardSummary(limit: number): LibrarySummaryDTO;
  listRecentGenerations(limit: number): LibraryGenerationDTO[];
  deleteGeneration(id: string): boolean;
}
