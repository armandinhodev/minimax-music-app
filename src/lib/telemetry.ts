/**
 * Minimal server-side telemetry hook.
 * Today: structured console logging.
 * Tomorrow: swap for Sentry.captureException without changing call sites.
 *
 * @server-only — never imported from client-side code.
 */

import 'server-only';

type ErrorWithMetadata = {
  code?: unknown;
  status?: unknown;
  retryAfterSeconds?: unknown;
  message?: unknown;
  name?: unknown;
  stack?: unknown;
};

export interface ServerErrorContext {
  endpoint: string;
  method: string;
  statusCode: number;
  miniMaxCode?: number;
  miniMaxMessage?: string;
  stack?: string;
  operation?: string;
  kind?: 'route_error' | 'upload_failure' | 'stream_failure' | 'stream_stall' | 'upstream_retry';
  attemptNumber?: number;
}

export interface UserSafeErrorDetails {
  userMessage: string;
  code?: number;
  httpStatus: number;
  retryable?: boolean;
  retryAfterSeconds?: number;
}

export interface TelemetryEvent {
  timestamp: string;
  level: 'error';
  service: 'minimax-api';
  eventType: ServerErrorContext['kind'];
  endpoint: string;
  method: string;
  operation: string;
  statusCode: number;
  miniMaxCode?: number;
  miniMaxMessage: string | null;
  upstreamStatus: number | null;
  retryAfterSeconds: number | null;
  attemptNumber?: number;
  retryable: boolean;
  errorName: string;
  errorMessage: string;
  stack?: string;
  redacted: true;
}

export interface TelemetryReporter {
  report(event: TelemetryEvent): void | Promise<void>;
}

function sanitizeTelemetryValue(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~\-+/=]+/gi, 'Bearer [REDACTED]')
    .replace(/((?:api|access|auth|secret|token)[_-]?key\s*[:=]\s*)([^\s,'"]+)/gi, '$1[REDACTED]')
    .replace(/((?:token|secret|key|authorization)=)([^&\s]+)/gi, '$1[REDACTED]');
}

function asSanitizedString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  return sanitizeTelemetryValue(value);
}

function isRetryableStatus(status: number | undefined): boolean {
  return typeof status === 'number' && (status === 408 || status === 429 || (status >= 500 && status < 600));
}

function getErrorMetadata(error: unknown): { code?: number; status?: number; retryAfterSeconds?: number } {
  const maybeError = error as ErrorWithMetadata | null;
  const code = typeof maybeError?.code === 'number' ? maybeError.code : undefined;
  const status = typeof maybeError?.status === 'number' ? maybeError.status : undefined;
  const retryAfterSeconds = typeof maybeError?.retryAfterSeconds === 'number'
    ? maybeError.retryAfterSeconds
    : undefined;

  return { code, status, retryAfterSeconds };
}

function createConsoleAndWebhookReporter(webhookUrl?: string): TelemetryReporter {
  return {
    report(event) {
      console.error(JSON.stringify(event));

      if (!webhookUrl) {
        return;
      }

      void fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          service: 'minimax-api',
          eventType: 'route_error',
          endpoint: '/telemetry/webhook',
          method: 'POST',
          operation: 'telemetry-webhook',
           statusCode: 500,
           miniMaxMessage: null,
           upstreamStatus: null,
           retryAfterSeconds: null,
           retryable: false,
          errorName: 'TelemetryWebhookError',
          errorMessage: 'Failed to deliver MiniMax telemetry webhook event.',
          redacted: true,
        } satisfies TelemetryEvent));
      });
    },
  };
}

let telemetryReporter: TelemetryReporter = createConsoleAndWebhookReporter(process.env.MINIMAX_TELEMETRY_WEBHOOK_URL);

export function setTelemetryReporterForTests(reporter: TelemetryReporter | null): void {
  telemetryReporter = reporter ?? createConsoleAndWebhookReporter(process.env.MINIMAX_TELEMETRY_WEBHOOK_URL);
}

export function getTelemetryReporter(): TelemetryReporter {
  return telemetryReporter;
}

function buildTelemetryEvent(error: unknown, context: ServerErrorContext): TelemetryEvent {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : 'Unknown';
  const { code, status, retryAfterSeconds } = getErrorMetadata(error);

  return {
    timestamp: new Date().toISOString(),
    level: 'error',
    service: 'minimax-api',
    eventType: context.kind ?? 'route_error',
    endpoint: context.endpoint,
    method: context.method,
    operation: context.operation ?? `${context.method} ${context.endpoint}`,
    statusCode: context.statusCode,
    miniMaxCode: context.miniMaxCode ?? code,
    miniMaxMessage: asSanitizedString(context.miniMaxMessage) ?? null,
    upstreamStatus: status ?? null,
    retryAfterSeconds: retryAfterSeconds ?? null,
    attemptNumber: context.attemptNumber,
    retryable: isRetryableStatus(status),
    errorName,
    errorMessage: sanitizeTelemetryValue(errorMessage),
    stack: asSanitizedString(context.stack ?? (error instanceof Error ? error.stack : undefined)),
    redacted: true,
  };
}

/**
 * Capture a server-side error with structured context.
 * Logs to console.error in structured format for log aggregation.
 * Replace implementation with Sentry.captureException(e, { extra: context })
 * without changing call sites.
 */
export function captureServerError(error: unknown, context: ServerErrorContext): void {
  void telemetryReporter.report(buildTelemetryEvent(error, context));
}

/**
 * Record an upload failure with structured context.
 * Thin convenience over captureServerError that pins the event kind to
 * 'upload_failure' so observability dashboards can bucket upload errors
 * separately from generic route errors. Always-normalized fields
 * (miniMaxMessage, upstreamStatus, retryAfterSeconds) are guaranteed
 * non-undefined (null when unknown) so downstream pipelines can rely on
 * the shape without per-event branching.
 */
export function recordUploadFailure(
  error: unknown,
  context: {
    endpoint: string;
    method: string;
    statusCode: number;
    operation?: string;
    miniMaxCode?: number;
    miniMaxMessage?: string | null;
    attemptNumber?: number;
  }
): void {
  captureServerError(error, {
    endpoint: context.endpoint,
    method: context.method,
    statusCode: context.statusCode,
    kind: 'upload_failure',
    operation: context.operation ?? 'file.upload',
    miniMaxCode: context.miniMaxCode,
    miniMaxMessage: context.miniMaxMessage ?? undefined,
    attemptNumber: context.attemptNumber,
  });
}

/**
 * Maps an unknown error to a user-safe message, without leaking internal details.
 * Returns { userMessage, code } where code is the numeric MiniMax code if available.
 *
 * - VoiceCloneNotVerifiedError (2038) → "Voice cloning requires account verification."
 * - All others → "An unexpected error occurred. Please try again."
 */
export function getUserSafeMessage(
  error: unknown,
  miniMaxCode?: number
): UserSafeErrorDetails {
  const { code, status, retryAfterSeconds } = getErrorMetadata(error);
  const resolvedCode = miniMaxCode ?? code;

  // 2038 must be exact
  if (resolvedCode === 2038 || (error instanceof Error && error.message === 'Voice cloning requires account verification.')) {
    return { userMessage: 'Voice cloning requires account verification.', code: 2038, httpStatus: 403 };
  }

  if (status === 429) {
    return {
      userMessage: 'MiniMax is rate limiting requests. Please retry shortly.',
      code: resolvedCode,
      httpStatus: 429,
      retryable: true,
      retryAfterSeconds,
    };
  }

  if (status === 408) {
    return {
      userMessage: 'MiniMax timed out. Please retry shortly.',
      code: resolvedCode,
      httpStatus: 504,
      retryable: true,
      retryAfterSeconds,
    };
  }

  if (typeof status === 'number' && status >= 500 && status < 600) {
    return {
      userMessage: 'MiniMax is temporarily unavailable. Please retry shortly.',
      code: resolvedCode,
      httpStatus: 503,
      retryable: true,
      retryAfterSeconds,
    };
  }

  // Generic user-safe message for all other errors
  return {
    userMessage: 'An unexpected error occurred. Please try again.',
    code: resolvedCode,
    httpStatus: 500,
  };
}
