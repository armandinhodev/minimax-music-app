/**
 * StreamT2A use case — SSE streaming text-to-audio.
 * Returns a ReadableStream of raw SSE chunks forwarded from MiniMax.
 */

import type { IMiniMaxSpeechClient } from '@/domain/interfaces/IMiniMaxSpeechClient';
import { StreamT2ASchema } from '@/application/dto/T2ADTO';
import { DEFAULT_T2A_MODEL } from '@/domain/value-objects/T2APolicy';

export class StreamT2AValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StreamT2AValidationError';
  }
}

export class StreamT2AUseCase {
  constructor(private readonly speechClient: IMiniMaxSpeechClient) {}

  /**
   * Execute SSE streaming T2A synthesis.
   *
   * @throws StreamT2AValidationError — invalid input
   * @throws Error                    — MiniMax API errors
   */
  async execute(request: {
    text: string;
    voiceId: string;
    model?: string;
  }): Promise<ReadableStream> {
    const parsed = StreamT2ASchema.safeParse(request);
    if (!parsed.success) {
      throw new StreamT2AValidationError(
        parsed.error.issues.map((e: { message: string }) => e.message).join('; ')
      );
    }

    const { text, voiceId, model = DEFAULT_T2A_MODEL } = parsed.data;

    return this.speechClient.stream(text, voiceId, model);
  }
}
