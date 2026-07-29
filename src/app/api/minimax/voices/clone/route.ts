/**
 * POST /api/minimax/voices/clone
 * Clone a voice using a previously-uploaded file.
 * Accepts JSON: { fileId, voiceId, optionalClonePrompt?, optionalPreviewText?, optionalModel? }
 * fileId: MiniMax file_id from a prior /api/minimax/files/upload call.
 * Validates Authorization: Bearer <APP_ACCESS_KEY>.
 * Error 2038 → "Voice cloning requires account verification."
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '../../../_shared/auth';
import { CloneVoiceSchema } from '@/lib/validators';
import { CloneVoiceUseCase } from '@/application/use-cases/voice/CloneVoice';
import { MiniMaxSpeechClient } from '@/infrastructure/minimax/MiniMaxSpeechClient';
import { MiniMaxFileClient } from '@/infrastructure/minimax/MiniMaxFileClient';
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

  const parsed = CloneVoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((e: { message: string }) => e.message).join('; ') },
      { status: 400 }
    );
  }

  try {
    const useCase = new CloneVoiceUseCase(
      new MiniMaxSpeechClient(),
      new MiniMaxFileClient()
    );

    // Clone from already-uploaded fileId — skip upload step
    const voice = await useCase.execute({
      audioBuffer: Buffer.alloc(0),
      fileName: 'clone_audio.mp3',
      voiceId: parsed.data.voiceId,
      optionalClonePrompt: parsed.data.optionalClonePrompt,
      optionalPreviewText: parsed.data.optionalPreviewText,
      optionalModel: parsed.data.optionalModel,
      preUploadedFileId: parsed.data.fileId,
    });

    return NextResponse.json({ voice });
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/voices/clone',
      method: 'POST',
      statusCode: 500,
    });
  }
}
