/**
 * POST /api/minimax/voices/design
 * Design a voice from a natural-language prompt.
 * Validates Authorization: Bearer <APP_ACCESS_KEY> and DesignVoiceSchema.
 * Returns { voice, trialAudio?, trialAudioUrl? }.
 * trialAudio is hex-encoded for AudioPlayer playback.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '../../../_shared/auth';
import { DesignVoiceSchema } from '@/lib/validators';
import { DesignVoiceUseCase } from '@/application/use-cases/voice/DesignVoice';
import { MiniMaxSpeechClient } from '@/infrastructure/minimax/MiniMaxSpeechClient';
import { createMiniMaxRouteErrorResponse } from '../../_shared/route-error';

export async function POST(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = DesignVoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((e: { message: string }) => e.message).join('; ') },
      { status: 400 }
    );
  }

  try {
    const useCase = new DesignVoiceUseCase(new MiniMaxSpeechClient());
    const result = await useCase.execute(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/voices/design',
      method: 'POST',
      statusCode: 500,
    });
  }
}
