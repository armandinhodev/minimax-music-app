/**
 * POST /api/minimax/files/upload
 * Upload a file to MiniMax (generic — purpose determines usage).
 * Accepts multipart/form-data: file (File), purpose (string: voice_clone | prompt_audio | t2a_async_input | t2a_async).
 * Validates Authorization: Bearer <APP_ACCESS_KEY>.
 *
 * Server-side validation by purpose:
 * - voice_clone / prompt_audio : mp3/m4a/wav only, ≤20 MB
 * - t2a_async_input           : txt/zip only, ≤20 MB
 * - t2a_async                 : any type, ≤20 MB (MiniMax handles content)
 *
 * Returns { fileId, fileName, purpose, size, createdAt }.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '../../../_shared/auth';
import { UploadFileUseCase } from '@/application/use-cases/file/UploadFile';
import { MiniMaxFileClient } from '@/infrastructure/minimax/MiniMaxFileClient';
import type { FilePurpose } from '@/application/dto/FileDTO';
import {
  ALL_UPLOAD_PURPOSES,
} from '@/lib/upload-policy';
import {
  isAllowedUploadPurpose,
  validateFileForPurpose,
} from '@/lib/upload-validation';
import { createMiniMaxRouteErrorResponse } from '../../_shared/route-error';
import { recordUploadFailure } from '@/lib/telemetry';

export async function POST(request: Request) {
  const authError = requireAuth(request);
  if (authError) return authError;

  // Chunked requests may omit Content-Length; validate the actual multipart payload instead.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const purposeStr = formData.get('purpose') as string | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file (File) is required' }, { status: 400 });
  }
  if (!purposeStr || typeof purposeStr !== 'string') {
    return NextResponse.json({ error: 'purpose is required' }, { status: 400 });
  }

  if (!isAllowedUploadPurpose(purposeStr)) {
    return NextResponse.json(
      { error: `purpose must be one of: ${ALL_UPLOAD_PURPOSES.join(', ')}` },
      { status: 400 }
    );
  }

  const purpose = purposeStr as FilePurpose;

  let fileBuffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 400 });
  }

  // Server-side purpose+type/content/size validation
  const validationError = validateFileForPurpose(
    file.name,
    file.type,
    file.size,
    fileBuffer,
    purpose
  );
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const useCase = new UploadFileUseCase(new MiniMaxFileClient());
    const result = await useCase.execute({
      fileBuffer,
      fileName: file.name,
      purpose,
    });
    return NextResponse.json(result);
  } catch (error) {
    recordUploadFailure(error, {
      endpoint: '/api/minimax/files/upload',
      method: 'POST',
      statusCode: 500,
      operation: 'file.upload',
    });
    return createMiniMaxRouteErrorResponse(error, {
      endpoint: '/api/minimax/files/upload',
      method: 'POST',
      statusCode: 500,
    });
  }
}
