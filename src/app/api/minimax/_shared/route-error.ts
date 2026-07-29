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
  const { userMessage, code, httpStatus, retryable, retryAfterSeconds, details } = getUserSafeMessage(error);

  captureServerError(error, {
    ...context,
    statusCode: httpStatus,
    miniMaxCode: context.miniMaxCode ?? code,
  });

  // Server-side console logging for dev visibility (Next.js dev server
  // prints these to the terminal running `pnpm dev`).
  console.error(
    `[${context.endpoint} ${context.method}] ${userMessage}` +
      (details?.upstreamStatus ? ` (upstream HTTP ${details.upstreamStatus})` : '') +
      (details?.upstreamMessage ? ` — ${details.upstreamMessage}` : '')
  );

  return NextResponse.json(
    { error: userMessage, code, retryable, retryAfterSeconds, details },
    { status: httpStatus }
  );
}
