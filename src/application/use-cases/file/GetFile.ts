/**
 * GetFile use case — retrieve file metadata and a fresh download URL.
 */

import type { IMiniMaxFileClient } from '@/domain/interfaces/IMiniMaxFileClient';
import type { GetFileResponse } from '@/application/dto/FileDTO';
import { GetFileSchema } from '@/lib/validators';

export class GetFileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GetFileValidationError';
  }
}

export class GetFileUseCase {
  constructor(private readonly fileClient: IMiniMaxFileClient) {}

  /**
   * Execute get file — retrieve metadata and a fresh download URL.
   *
   * @throws GetFileValidationError — invalid file_id
   * @throws Error                  — MiniMax API errors
   */
  async execute(request: { fileId: string }): Promise<GetFileResponse> {
    const parsed = GetFileSchema.safeParse(request);
    if (!parsed.success) {
      throw new GetFileValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; ')
      );
    }

    const metadata = await this.fileClient.getFile(parsed.data.fileId);

    return {
      file: {
        fileId: metadata.fileId,
        fileName: metadata.fileName,
        purpose: metadata.purpose,
        size: metadata.size,
        createdAt: metadata.createdAt,
      },
      downloadUrl: metadata.downloadUrl,
      expiresAt: Date.now() + 9 * 60 * 60 * 1000, // 9-hour TTL for download URLs
    };
  }
}
