/**
 * PollAsyncT2A use case — poll task status until completion or until the
 * caller's attempt budget is exhausted.
 */

import type { IMiniMaxSpeechClient } from '@/domain/interfaces/IMiniMaxSpeechClient';
import type { PollAsyncT2AResponse } from '@/application/dto/T2ADTO';

export class PollAsyncT2AUseCase {
  constructor(private readonly speechClient: IMiniMaxSpeechClient) {}

  /**
   * Poll async T2A task status.
   *
   * @param taskId — the task_id returned by SubmitAsyncT2A
   * @param options.pollIntervalMs — ms between polls (default 2 000)
   * @param options.maxAttempts    — stop after N attempts (default 60 → ~2 min)
   *
   * Returns the latest deterministic task state. Transport/system failures are
   * still thrown by the speech client.
   */
  async execute(
    taskId: string,
    options: { pollIntervalMs?: number; maxAttempts?: number } = {}
  ): Promise<PollAsyncT2AResponse> {
    const { pollIntervalMs = 2000, maxAttempts = 60 } = options;

    if (!taskId || typeof taskId !== 'string') {
      throw new Error('taskId is required');
    }

    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
      const { status, fileId } = await this.speechClient.pollTask(taskId);

      if (status === 'success') {
        return fileId
          ? { status: 'success', taskId, fileId }
          : { status: 'success', taskId };
      }

      if (status === 'failed' || status === 'expired') {
        return { status, taskId };
      }

      if (attempts === maxAttempts) {
        return { status: 'processing', taskId };
      }

      await sleep(pollIntervalMs);
    }

    return { status: 'processing', taskId };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
