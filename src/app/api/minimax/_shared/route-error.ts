import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import { captureServerError, getUserSafeMessage, type ServerErrorContext } from '@/lib/telemetry';

export function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join('; ');
}

export function createValidationErrorResponse(error: ZodError) {
  return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
}

export function createInvalidJsonResponse() {
  return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
}

export function createMiniMaxRouteErrorResponse(error: unknown, context: ServerErrorContext) {
  const { userMessage, code, httpStatus, retryable, retryAfterSeconds } = getUserSafeMessage(error);

  captureServerError(error, {
    ...context,
    statusCode: httpStatus,
    miniMaxCode: context.miniMaxCode ?? code,
  });

  return NextResponse.json(
    { error: userMessage, code, retryable, retryAfterSeconds },
    { status: httpStatus }
  );
}
