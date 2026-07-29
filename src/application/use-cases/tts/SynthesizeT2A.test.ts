/** @vitest-environment node */

/**
 * SynthesizeT2A unit tests — use case with mocked MiniMaxSpeechClient.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SynthesizeT2AUseCase, SynthesizeT2AValidationError } from './SynthesizeT2A';
import type { IMiniMaxSpeechClient } from '@/domain/interfaces/IMiniMaxSpeechClient';
import { VoiceCloneNotVerifiedError } from '@/application/errors/VoiceCloneNotVerifiedError';

function createMockSpeechClient(overrides: Partial<IMiniMaxSpeechClient> = {}): IMiniMaxSpeechClient {
  return {
    synthesize: vi.fn().mockResolvedValue({ id: 'audio_1', format: 'mp3', duration: 5, audioHex: '00' }),
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

describe('SynthesizeT2AUseCase', () => {
  let mockClient: IMiniMaxSpeechClient;
  let useCase: SynthesizeT2AUseCase;

  beforeEach(() => {
    mockClient = createMockSpeechClient();
    useCase = new SynthesizeT2AUseCase(mockClient);
  });

  it('returns audioUrl when MiniMax returns downloadUrl', async () => {
    mockClient.synthesize = vi.fn().mockResolvedValue({
      id: 'audio_1',
      format: 'mp3',
      duration: 10,
      downloadUrl: 'https://example.com/audio.mp3',
    });

    const result = await useCase.execute({
      text: 'Hello world',
      voiceId: 'sys_male_english_1',
    });

    expect(result.audioUrl).toBe('https://example.com/audio.mp3');
  });

  it('calls speechClient.synthesize with correct arguments', async () => {
    mockClient.synthesize = vi.fn().mockResolvedValue({
      id: 'audio_1',
      format: 'mp3',
      duration: 5,
      audioHex: '00',
    });

    await useCase.execute({
      text: 'Test speech',
      voiceId: 'sys_female_english_1',
      model: 'speech-2.8',
    });

    expect(mockClient.synthesize).toHaveBeenCalledWith({
      text: 'Test speech',
      voiceId: 'sys_female_english_1',
      model: 'speech-2.8',
      format: 'mp3',
    });
  });

  it('uses default model speech-2.8-hd when not provided', async () => {
    mockClient.synthesize = vi.fn().mockResolvedValue({
      id: 'audio_1',
      format: 'mp3',
      duration: 5,
      audioHex: '00',
    });

    await useCase.execute({
      text: 'Hello',
      voiceId: 'sys_male_english_1',
    });

    expect(mockClient.synthesize).toHaveBeenCalledWith({
      text: 'Hello',
      voiceId: 'sys_male_english_1',
      model: 'speech-2.8-hd',
      format: 'mp3',
    });
  });

  it('propagates requested audio format to the speech client', async () => {
    await useCase.execute({
      text: 'Hello world',
      voiceId: 'sys_male_english_1',
      model: 'speech-2.8-hd',
      format: 'wav',
    });

    expect(mockClient.synthesize).toHaveBeenCalledWith({
      text: 'Hello world',
      voiceId: 'sys_male_english_1',
      model: 'speech-2.8-hd',
      format: 'wav',
    });
  });

  it('throws SynthesizeT2AValidationError for empty text', async () => {
    await expect(
      useCase.execute({ text: '', voiceId: 'sys_male_english_1' })
    ).rejects.toThrow(SynthesizeT2AValidationError);
  });

  it('throws SynthesizeT2AValidationError for text exceeding 10,000 chars', async () => {
    await expect(
      useCase.execute({
        text: 'a'.repeat(10001),
        voiceId: 'sys_male_english_1',
      })
    ).rejects.toThrow(SynthesizeT2AValidationError);
  });

  it('throws SynthesizeT2AValidationError for invalid voice_id', async () => {
    await expect(
      useCase.execute({ text: 'Hello', voiceId: '123-invalid' })
    ).rejects.toThrow(SynthesizeT2AValidationError);
  });

  it('throws VoiceCloneNotVerifiedError when MiniMax returns code 2038', async () => {
    const error = new VoiceCloneNotVerifiedError();
    mockClient.synthesize = vi.fn().mockRejectedValue(error);

    await expect(
      useCase.execute({ text: 'Hello', voiceId: 'clone_voice_1' })
    ).rejects.toThrow(VoiceCloneNotVerifiedError);
  });

  it('throws generic Error for other MiniMax errors', async () => {
    const error = new Error('MiniMax API error');
    mockClient.synthesize = vi.fn().mockRejectedValue(error);

    await expect(
      useCase.execute({ text: 'Hello', voiceId: 'sys_male_english_1' })
    ).rejects.toThrow('MiniMax API error');
  });

  it('rejects when neither audioUrl nor hex is returned', async () => {
    mockClient.synthesize = vi.fn().mockResolvedValue({
      id: 'audio_1',
      format: 'mp3',
      duration: 5,
    });

    await expect(useCase.execute({
      text: 'Hello',
      voiceId: 'sys_male_english_1',
    })).rejects.toThrow('MiniMax returned no audio URL or audio payload.');
  });

  it('returns { audio: hex } when MiniMax returns audioHex', async () => {
    // MiniMax sync T2A may return hex audio directly
    mockClient.synthesize = vi.fn().mockResolvedValue({
      id: 'audio_1',
      format: 'mp3',
      duration: 5,
      downloadUrl: '',
      audioHex: '48656c6c6f', // "Hello" in hex
    });

    const result = await useCase.execute({
      text: 'Hello',
      voiceId: 'sys_male_english_1',
    });

    expect(result).toEqual({ audio: '48656c6c6f' });
  });

  it('prefers audioUrl over audioHex when both are returned', async () => {
    mockClient.synthesize = vi.fn().mockResolvedValue({
      id: 'audio_1',
      format: 'mp3',
      duration: 10,
      downloadUrl: 'https://cdn.example.com/audio.mp3',
      audioHex: '48656c6c6f',
    });

    const result = await useCase.execute({
      text: 'Hello',
      voiceId: 'sys_male_english_1',
    });

    // audioUrl takes precedence per MiniMax API contract
    expect(result).toEqual({ audioUrl: 'https://cdn.example.com/audio.mp3' });
    expect(result.audio).toBeUndefined();
  });
});
