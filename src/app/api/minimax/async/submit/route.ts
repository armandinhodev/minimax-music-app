/**
 * POST /api/minimax/async/submit
 * Submit a long-text T2A task for async processing (text up to 1,000,000 chars).
 * Validates Authorization: Bearer <APP_ACCESS_KEY> and AsyncT2ASubmitSchema.
 * Returns { taskId: string }.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '../../../_shared/auth';
import { AsyncT2ASubmitSchema } from '@/lib/validators';
import { SubmitAsyncT2AUseCase } from '@/application/use-cases/tts/SubmitAsyncT2A';
import { MiniMaxSpeechClient } from '@/infrastructure/minimax/MiniMaxSpeechClient';
import {
  createInvalidJsonResponse,
  createMiniMaxRouteErrorResponse,
  createValidationErrorResponse,
} from '../../_shared/route-error';

export async function POST(request: Request) {
  // Auth guard
  const authError = requireAuth(request);
  if (authError) return authError;

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createInvalidJsonResponse();
  }

  // Validate schema
  const parsed = AsyncT2ASubmitSchema.safeParse(body);
  if (!parsed.success) {
    return createValidationErrorResponse(parsed.error);
  }

  try {
    const useCase = new SubmitAsyncT2AUseCase(new MiniMaxSpeechClient());
    const task = await useCase.execute(parsed.data);
    return NextResponse.json({ taskId: task.taskId });
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/async/submit',
      method: 'POST',
      statusCode: 500,
    });
  }
}
