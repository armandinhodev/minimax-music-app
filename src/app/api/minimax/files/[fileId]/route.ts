/**
 * GET  /api/minimax/files/[fileId] — retrieve file metadata and a fresh download URL
 * DELETE /api/minimax/files/[fileId] — delete a file by file_id
 * Both require Authorization: Bearer <APP_ACCESS_KEY>.
 * DELETE requires purpose (voice_clone | prompt_audio | t2a_async_input | t2a_async)
 * because MiniMax file delete requires { file_id, purpose }.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_shared/auth';
import { GetFileUseCase } from '@/application/use-cases/file/GetFile';
import { DeleteFileUseCase } from '@/application/use-cases/file/DeleteFile';
import { MiniMaxFileClient } from '@/infrastructure/minimax/MiniMaxFileClient';
import { DeleteFileSchema, GetFileSchema } from '@/lib/validators';
import {
  createInvalidJsonResponse,
  createMiniMaxRouteErrorResponse,
  createValidationErrorResponse,
} from '../../_shared/route-error';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const authError = requireAuth(_request);
  if (authError) return authError;

  const parsed = GetFileSchema.safeParse(await params);
  if (!parsed.success) {
    return createValidationErrorResponse(parsed.error);
  }

  try {
    const useCase = new GetFileUseCase(new MiniMaxFileClient());
    const result = await useCase.execute(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/files/[fileId]',
      method: 'GET',
      statusCode: 500,
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const routeParams = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createInvalidJsonResponse();
  }

  const parsed = DeleteFileSchema.safeParse({
    fileId: routeParams.fileId,
    ...(typeof body === 'object' && body !== null ? body : {}),
  });

  if (!parsed.success) {
    return createValidationErrorResponse(parsed.error);
  }

  try {
    const useCase = new DeleteFileUseCase(new MiniMaxFileClient());
    await useCase.execute(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/files/[fileId]',
      method: 'DELETE',
      statusCode: 500,
    });
  }
}
