/**
 * POST /api/minimax/tts
 * Sync text-to-audio synthesis (≤10,000 chars).
 * Validates Authorization: Bearer <APP_ACCESS_KEY> and T2ARequestSchema.
 * Returns { audio: hex } or { audioUrl: string }.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '../../_shared/auth';
import { T2ARequestSchema } from '@/lib/validators';
import { SynthesizeT2AUseCase } from '@/application/use-cases/tts/SynthesizeT2A';
import { MiniMaxSpeechClient } from '@/infrastructure/minimax/MiniMaxSpeechClient';
import {
  createInvalidJsonResponse,
  createMiniMaxRouteErrorResponse,
  createValidationErrorResponse,
} from '../_shared/route-error';

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
  const parsed = T2ARequestSchema.safeParse(body);
  if (!parsed.success) {
    return createValidationErrorResponse(parsed.error);
  }

  try {
    const useCase = new SynthesizeT2AUseCase(new MiniMaxSpeechClient());
    const result = await useCase.execute(parsed.data);

    if (result.audioUrl) {
      return NextResponse.json({ audioUrl: result.audioUrl });
    }

    if (result.audio) {
      return NextResponse.json({ audio: result.audio });
    }

    return NextResponse.json({ error: 'Unexpected empty synthesis result' }, { status: 502 });
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/tts',
      method: 'POST',
      statusCode: 500,
    });
  }
}
