/**
 * GET /api/minimax/async/status/[taskId]
 * Single-shot status check for an async T2A task.
 * Does NOT poll — caller is responsible for polling/backoff on the client.
 * Validates Authorization: Bearer <APP_ACCESS_KEY>.
 * Returns { status, taskId, fileId? }.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../_shared/auth';
import { PollAsyncT2AUseCase } from '@/application/use-cases/tts/PollAsyncT2A';
import { MiniMaxSpeechClient } from '@/infrastructure/minimax/MiniMaxSpeechClient';
import { createMiniMaxRouteErrorResponse } from '../../../_shared/route-error';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  // Auth guard
  const authError = requireAuth(_request);
  if (authError) return authError;

  const { taskId } = await params;

  if (!taskId || typeof taskId !== 'string') {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }

  try {
    const useCase = new PollAsyncT2AUseCase(new MiniMaxSpeechClient());
    // Single status check only — polling/backoff is delegated to client
    const result = await useCase.execute(taskId, { maxAttempts: 1 });
    return NextResponse.json(result);
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/async/status/[taskId]',
      method: 'GET',
      statusCode: 500,
    });
  }
}
