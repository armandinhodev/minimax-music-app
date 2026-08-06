import type { CreateLibraryGenerationDTO } from '@/application/dto/LibraryDTO';
import { RecordGenerationUseCase } from '@/application/use-cases/library/RecordGeneration';
import { SQLiteGenerationRepository } from '@/infrastructure/sqlite/SQLiteGenerationRepository';

export function recordGenerationBestEffort(input: CreateLibraryGenerationDTO): void {
  try {
    const useCase = new RecordGenerationUseCase(new SQLiteGenerationRepository());
    useCase.execute(input);
  } catch (error) {
    console.error('Failed to persist generation metadata.', error);
  }
}
