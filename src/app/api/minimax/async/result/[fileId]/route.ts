/**
 * GET /api/minimax/async/result/[fileId]
 * Re-fetch a fresh download URL for an async T2A result file by file_id.
 * Validates Authorization: Bearer <APP_ACCESS_KEY>.
 * Returns { downloadUrl, expiresAt, file: { fileId, fileName, purpose, size, createdAt } }.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../_shared/auth';
import { GetFileUseCase } from '@/application/use-cases/file/GetFile';
import { MiniMaxFileClient } from '@/infrastructure/minimax/MiniMaxFileClient';
import { createMiniMaxRouteErrorResponse } from '../../../_shared/route-error';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  // Auth guard
  const authError = requireAuth(_request);
  if (authError) return authError;

  const { fileId } = await params;

  if (!fileId || typeof fileId !== 'string') {
    return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
  }

  try {
    const useCase = new GetFileUseCase(new MiniMaxFileClient());
    const result = await useCase.execute({ fileId });
    return NextResponse.json(result);
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/async/result/[fileId]',
      method: 'GET',
      statusCode: 500,
    });
  }
}
