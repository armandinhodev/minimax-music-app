import { NextResponse } from 'next/server';
import { SQLiteGenerationRepository } from '@/infrastructure/sqlite/SQLiteGenerationRepository';
import { requireAuth } from '../../../_shared/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ generationId: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const { generationId } = await context.params;
  const deleted = new SQLiteGenerationRepository().deleteGeneration(generationId);

  return NextResponse.json({ deleted });
}
