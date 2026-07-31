/**
 * POST /api/minimax/music/cover-preprocess
 * Preprocesses reference audio for MiniMax Music Cover while keeping MINIMAX_API_KEY server-side.
 */

import { NextResponse } from 'next/server';
import { PreprocessMusicCoverUseCase } from '@/application/use-cases/music/PreprocessMusicCover';
import { MiniMaxMusicClient } from '@/infrastructure/minimax/MiniMaxMusicClient';
import { MusicCoverPreprocessRequestSchema } from '@/lib/validators';
import { requireAuth } from '../../../_shared/auth';
import {
  createInvalidJsonResponse,
  createMiniMaxRouteErrorResponse,
  createValidationErrorResponse,
} from '../../_shared/route-error';

export async function POST(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createInvalidJsonResponse();
  }

  const parsed = MusicCoverPreprocessRequestSchema.safeParse(body);
  if (!parsed.success) {
    return createValidationErrorResponse(parsed.error);
  }

  try {
    const useCase = new PreprocessMusicCoverUseCase(new MiniMaxMusicClient());
    const result = await useCase.execute(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/music/cover-preprocess',
      method: 'POST',
      statusCode: 500,
    });
  }
}
