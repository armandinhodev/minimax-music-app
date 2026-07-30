/**
 * MiniMax Image HTTP client.
 * Server-only: never imported from client-side code.
 * @server-only
 */

import 'server-only';

import { IMAGE_MODEL, type GenerateImageRequest, type GenerateImageResponse } from '@/application/dto/ImageDTO';
import {
  buildAuthHeader,
  MINIMAX_BASE_URL,
  parseMiniMaxApplicationError,
  parseMiniMaxError,
  requireMiniMaxApiKey,
  type MiniMaxApiError,
} from './MiniMaxConfig';
import { emitUpstreamRetryTelemetry, readResponseBodyOnce } from './retry-utils';

export class MiniMaxImageError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'MiniMaxImageError';
  }
}

const FETCH_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_OPTS = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
};

function normalizeError(apiError: MiniMaxApiError): MiniMaxImageError {
  return new MiniMaxImageError(apiError.message, apiError.code, apiError.status, apiError.retryAfterSeconds);
}

function isRetryable(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status < 600);
}

function isRetryableError(error: unknown): boolean {
  return error instanceof MiniMaxImageError && isRetryable(error.status ?? 0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveRetryDelayMs(
  attempt: number,
  retryAfterSeconds: number | undefined,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  if (typeof retryAfterSeconds === 'number') {
    return Math.min(Math.max(retryAfterSeconds, 0) * 1000, maxDelayMs);
  }

  return Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
}

async function fetchWithRetry<T>(
  url: string,
  init: RequestInit,
  apiKey: string,
  operation: string,
  options: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  const { maxRetries = DEFAULT_RETRY_OPTS.maxRetries, baseDelayMs = DEFAULT_RETRY_OPTS.baseDelayMs, maxDelayMs = DEFAULT_RETRY_OPTS.maxDelayMs } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          ...init.headers,
          Authorization: buildAuthHeader(apiKey),
        },
      });

      if (!response.ok) {
        const body = await readResponseBodyOnce(response);
        const apiError = parseMiniMaxError(response, body);

        if (isRetryable(response.status) && attempt < maxRetries) {
          lastError = normalizeError(apiError);
          emitUpstreamRetryTelemetry(apiError, operation, attempt + 1);
          await sleep(resolveRetryDelayMs(attempt, apiError.retryAfterSeconds, baseDelayMs, maxDelayMs));
          continue;
        }

        throw normalizeError(apiError);
      }

      const data = await response.json() as T & { base_resp?: { status_code: number; status_msg?: string } };
      if (data?.base_resp && typeof data.base_resp.status_code === 'number' && data.base_resp.status_code !== 0) {
        const apiError = parseMiniMaxApplicationError(response.status, data.base_resp);
        const normalizedError = normalizeError(apiError);

        if (isRetryableError(normalizedError) && attempt < maxRetries) {
          lastError = normalizedError;
          emitUpstreamRetryTelemetry(apiError, operation, attempt + 1);
          await sleep(resolveRetryDelayMs(attempt, apiError.retryAfterSeconds, baseDelayMs, maxDelayMs));
          continue;
        }

        throw normalizedError;
      }

      return data;
    } catch (error) {
      let nextError = error;
      if (nextError instanceof Error && nextError.name === 'AbortError') {
        nextError = new MiniMaxImageError('Request timed out', 0, 408);
      }

      if (!isRetryableError(nextError) || attempt >= maxRetries) {
        throw nextError;
      }

      lastError = nextError;
      emitUpstreamRetryTelemetry(
        {
          code: nextError instanceof MiniMaxImageError ? nextError.code : 0,
          message: nextError instanceof Error ? nextError.message : 'MiniMax retryable failure',
          status: nextError instanceof MiniMaxImageError ? nextError.status : undefined,
          retryAfterSeconds: nextError instanceof MiniMaxImageError ? nextError.retryAfterSeconds : undefined,
        },
        operation,
        attempt + 1
      );
      await sleep(resolveRetryDelayMs(
        attempt,
        nextError instanceof MiniMaxImageError ? nextError.retryAfterSeconds : undefined,
        baseDelayMs,
        maxDelayMs
      ));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

export class MiniMaxImageClient {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = requireMiniMaxApiKey();
  }

  async generateImage(request: GenerateImageRequest): Promise<GenerateImageResponse> {
    const url = `${MINIMAX_BASE_URL}/v1/image_generation`;
    const body = {
      model: request.model ?? IMAGE_MODEL,
      prompt: request.prompt,
      aspect_ratio: request.aspectRatio,
      ...(request.width !== undefined && request.height !== undefined
        ? { width: request.width, height: request.height }
        : {}),
      response_format: request.responseFormat ?? 'url',
      ...(request.subjectReference?.length
        ? {
            subject_reference: request.subjectReference.map((reference) => ({
              type: reference.type,
              image_file: reference.imageFile,
            })),
          }
        : {}),
      ...(request.seed !== undefined ? { seed: request.seed } : {}),
      n: request.n ?? 1,
      prompt_optimizer: request.promptOptimizer ?? false,
    };

    const data = await fetchWithRetry<MiniMaxImageGenerationResponse>(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      this.apiKey,
      'image.generate',
      { maxRetries: 0 }
    );

    const imageUrls = data.data?.image_urls?.filter((url): url is string => typeof url === 'string' && url.length > 0) ?? [];
    if (imageUrls.length === 0) {
      throw new MiniMaxImageError('MiniMax returned no image URLs', 0, 502);
    }

    return {
      id: data.id?.trim() || crypto.randomUUID(),
      imageUrls,
      metadata: {
        successCount: data.metadata?.success_count ?? imageUrls.length,
        failedCount: data.metadata?.failed_count ?? 0,
      },
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
  }
}

interface MiniMaxImageGenerationResponse {
  id?: string;
  data?: {
    image_urls?: string[];
  };
  metadata?: {
    success_count?: number;
    failed_count?: number;
  };
  base_resp?: {
    status_code: number;
    status_msg?: string;
  };
}
