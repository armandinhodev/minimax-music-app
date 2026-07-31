/**
 * POST /api/minimax/music
 * Generates music via MiniMax Music while keeping MINIMAX_API_KEY server-side.
 */

import { NextResponse } from 'next/server';
import { GenerateMusicUseCase } from '@/application/use-cases/music/GenerateMusic';
import { MiniMaxMusicClient } from '@/infrastructure/minimax/MiniMaxMusicClient';
import { GenerateMusicRequestSchema } from '@/lib/validators';
import { requireAuth } from '../../_shared/auth';
import {
  createInvalidJsonResponse,
  createMiniMaxRouteErrorResponse,
  createValidationErrorResponse,
} from '../_shared/route-error';

export async function POST(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createInvalidJsonResponse();
  }

  const parsed = GenerateMusicRequestSchema.safeParse(body);
  if (!parsed.success) {
    return createValidationErrorResponse(parsed.error);
  }

  try {
    const useCase = new GenerateMusicUseCase(new MiniMaxMusicClient());
    const result = await useCase.execute(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/music',
      method: 'POST',
      statusCode: 500,
    });
  }
}
