/** @vitest-environment node */

import { describe, it, expect, vi } from 'vitest';
import { PollAsyncT2AUseCase } from './PollAsyncT2A';
import type { IMiniMaxSpeechClient } from '@/domain/interfaces/IMiniMaxSpeechClient';

function createMockSpeechClient(overrides: Partial<IMiniMaxSpeechClient> = {}): IMiniMaxSpeechClient {
  return {
    synthesize: vi.fn(),
    stream: vi.fn(),
    submitAsync: vi.fn(),
    pollTask: vi.fn(),
    getVoices: vi.fn(),
    cloneVoice: vi.fn(),
    designVoice: vi.fn(),
    deleteVoice: vi.fn(),
    ...overrides,
  } as unknown as IMiniMaxSpeechClient;
}

describe('PollAsyncT2AUseCase', () => {
  it('returns processing immediately without sleeping when maxAttempts is 1 and task is still processing', async () => {
    const speechClient = createMockSpeechClient({
      pollTask: vi.fn().mockResolvedValue({ status: 'processing' }),
    });
    const useCase = new PollAsyncT2AUseCase(speechClient);
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    await expect(useCase.execute('task_123', { maxAttempts: 1, pollIntervalMs: 9999 })).resolves.toEqual({
      status: 'processing',
      taskId: 'task_123',
    });

    expect(speechClient.pollTask).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).not.toHaveBeenCalled();
    timeoutSpy.mockRestore();
  });

  it('returns success when the task completes on the first attempt', async () => {
    const speechClient = createMockSpeechClient({
      pollTask: vi.fn().mockResolvedValue({ status: 'success', fileId: 'file_123' }),
    });
    const useCase = new PollAsyncT2AUseCase(speechClient);

    await expect(useCase.execute('task_123', { maxAttempts: 1 })).resolves.toEqual({
      status: 'success',
      taskId: 'task_123',
      fileId: 'file_123',
    });
  });

  it('returns failed when the task fails', async () => {
    const speechClient = createMockSpeechClient({
      pollTask: vi.fn().mockResolvedValue({ status: 'failed' }),
    });
    const useCase = new PollAsyncT2AUseCase(speechClient);

    await expect(useCase.execute('task_failed', { maxAttempts: 3 })).resolves.toEqual({
      status: 'failed',
      taskId: 'task_failed',
    });
    expect(speechClient.pollTask).toHaveBeenCalledTimes(1);
  });

  it('returns expired when the task expires', async () => {
    const speechClient = createMockSpeechClient({
      pollTask: vi.fn().mockResolvedValue({ status: 'expired' }),
    });
    const useCase = new PollAsyncT2AUseCase(speechClient);

    await expect(useCase.execute('task_expired', { maxAttempts: 3 })).resolves.toEqual({
      status: 'expired',
      taskId: 'task_expired',
    });
    expect(speechClient.pollTask).toHaveBeenCalledTimes(1);
  });

  it('returns success even when fileId is not yet available', async () => {
    const speechClient = createMockSpeechClient({
      pollTask: vi.fn().mockResolvedValue({ status: 'success' }),
    });
    const useCase = new PollAsyncT2AUseCase(speechClient);
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    await expect(useCase.execute('task_missing_file', { maxAttempts: 2, pollIntervalMs: 1 })).resolves.toEqual({
      status: 'success',
      taskId: 'task_missing_file',
    });

    expect(speechClient.pollTask).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).not.toHaveBeenCalled();
    timeoutSpy.mockRestore();
  });
});
