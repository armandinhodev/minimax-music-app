import { NextResponse } from 'next/server';
import { ListLibraryGenerationsUseCase } from '@/application/use-cases/library/ListLibraryGenerations';
import { SQLiteGenerationRepository } from '@/infrastructure/sqlite/SQLiteGenerationRepository';
import { requireAuth } from '../../_shared/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseLimit(url: string): number {
  const value = new URL(url).searchParams.get('limit');
  const parsed = value ? Number(value) : 50;

  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(Math.floor(parsed), 100));
}

export async function GET(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const useCase = new ListLibraryGenerationsUseCase(new SQLiteGenerationRepository());
  return NextResponse.json({ generations: useCase.execute(parseLimit(request.url)) });
}
