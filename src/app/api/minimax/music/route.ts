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
import { recordGenerationBestEffort } from '../_shared/library-recording';

export const runtime = 'nodejs';

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
    recordGenerationBestEffort({
      kind: 'music',
      source: parsed.data.instrumental ? 'instrumental-music' : 'text-to-music',
      prompt: parsed.data.prompt || parsed.data.lyrics,
      model: parsed.data.model,
      providerGenerationId: result.id,
      metadata: {
        lyrics: parsed.data.instrumental ? undefined : parsed.data.lyrics,
        instrumental: parsed.data.instrumental,
        durationSeconds: result.metadata.durationSeconds,
        sampleRate: result.metadata.sampleRate,
        bitrate: result.metadata.bitrate,
        traceId: result.metadata.traceId,
      },
      assets: [{
        kind: 'audio',
        storageType: 'metadata_only',
        format: result.format,
        mimeType: 'audio/mpeg',
        sizeBytes: result.metadata.sizeBytes,
      }],
    });
    return NextResponse.json(result);
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/music',
      method: 'POST',
      statusCode: 500,
    });
  }
}
