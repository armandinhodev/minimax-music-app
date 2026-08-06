/**
 * POST /api/minimax/image
 * Generates images via MiniMax Image while keeping MINIMAX_API_KEY server-side.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '../../_shared/auth';
import { GenerateImageRequestSchema } from '@/lib/validators';
import { GenerateImageUseCase } from '@/application/use-cases/image/GenerateImage';
import { MiniMaxImageClient } from '@/infrastructure/minimax/MiniMaxImageClient';
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

  const parsed = GenerateImageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return createValidationErrorResponse(parsed.error);
  }

  try {
    const useCase = new GenerateImageUseCase(new MiniMaxImageClient());
    const result = await useCase.execute(parsed.data);
    recordGenerationBestEffort({
      kind: 'image',
      source: parsed.data.subjectReference?.length ? 'image-to-image' : 'text-to-image',
      prompt: parsed.data.prompt,
      model: 'image-01',
      providerGenerationId: result.id,
      metadata: {
        aspectRatio: parsed.data.aspectRatio,
        seed: parsed.data.seed,
        promptOptimizer: parsed.data.promptOptimizer,
        successCount: result.metadata.successCount,
        failedCount: result.metadata.failedCount,
      },
      assets: result.imageUrls.map((url, index) => ({
        kind: 'image',
        storageType: 'provider_url',
        storageRef: url,
        format: 'png',
        mimeType: 'image/png',
        expiresAt: result.expiresAt,
        metadata: { index },
      })),
    });
    return NextResponse.json(result);
  } catch (error) {
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/image',
      method: 'POST',
      statusCode: 500,
    });
  }
}
