/**
 * GET  /api/minimax/voices         — list all system + user voices
 * POST /api/minimax/voices         — delete a voice by voice_id
 * Both require Authorization: Bearer <APP_ACCESS_KEY>.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '../../_shared/auth';
import { GetVoicesUseCase } from '@/application/use-cases/voice/GetVoices';
import { DeleteVoiceUseCase } from '@/application/use-cases/voice/DeleteVoice';
import { MiniMaxSpeechClient } from '@/infrastructure/minimax/MiniMaxSpeechClient';
import { DeleteVoiceSchema } from '@/lib/validators';
import {
  createInvalidJsonResponse,
  createMiniMaxRouteErrorResponse,
  createValidationErrorResponse,
} from '../_shared/route-error';

export async function GET(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const useCase = new GetVoicesUseCase(new MiniMaxSpeechClient());
    const voices = await useCase.execute();
    return NextResponse.json({ voices });
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/voices',
      method: 'GET',
      statusCode: 500,
    });
  }
}

export async function POST(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return createInvalidJsonResponse();
  }

  const parsed = DeleteVoiceSchema.safeParse(body);
  if (!parsed.success) {
    return createValidationErrorResponse(parsed.error);
  }

  try {
    const useCase = new DeleteVoiceUseCase(new MiniMaxSpeechClient());
    await useCase.execute(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/voices',
      method: 'POST',
      statusCode: 500,
    });
  }
}
