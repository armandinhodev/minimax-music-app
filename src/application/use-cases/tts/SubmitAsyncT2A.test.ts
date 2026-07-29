/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SubmitAsyncT2AUseCase, SubmitAsyncT2AValidationError } from './SubmitAsyncT2A';
import type { IMiniMaxSpeechClient } from '@/domain/interfaces/IMiniMaxSpeechClient';

function createMockSpeechClient(overrides: Partial<IMiniMaxSpeechClient> = {}): IMiniMaxSpeechClient {
  return {
    synthesize: vi.fn(),
    stream: vi.fn(),
    submitAsync: vi.fn().mockResolvedValue({ taskId: 'task_123', status: 'processing', createdAt: 123 }),
    pollTask: vi.fn(),
    getVoices: vi.fn(),
    cloneVoice: vi.fn(),
    designVoice: vi.fn(),
    deleteVoice: vi.fn(),
    ...overrides,
  } as unknown as IMiniMaxSpeechClient;
}

describe('SubmitAsyncT2AUseCase', () => {
  let mockClient: IMiniMaxSpeechClient;
  let useCase: SubmitAsyncT2AUseCase;

  beforeEach(() => {
    mockClient = createMockSpeechClient();
    useCase = new SubmitAsyncT2AUseCase(mockClient);
  });

  it('uses shared default model and format when omitted', async () => {
    await useCase.execute({
      text: 'Hello world',
      voiceId: 'sys_male_english_1',
    });

    expect(mockClient.submitAsync).toHaveBeenCalledWith({
      text: 'Hello world',
      voiceId: 'sys_male_english_1',
      model: 'speech-2.8-hd',
      format: 'mp3',
    });
  });

  it('propagates requested output format to the speech client', async () => {
    await useCase.execute({
      text: 'Hello world',
      voiceId: 'sys_male_english_1',
      format: 'wav',
    });

    expect(mockClient.submitAsync).toHaveBeenCalledWith({
      text: 'Hello world',
      voiceId: 'sys_male_english_1',
      model: 'speech-2.8-hd',
      format: 'wav',
    });
  });

  it('rejects invalid async requests', async () => {
    await expect(useCase.execute({ text: '', voiceId: 'sys_male_english_1' })).rejects.toThrow(SubmitAsyncT2AValidationError);
  });
});
