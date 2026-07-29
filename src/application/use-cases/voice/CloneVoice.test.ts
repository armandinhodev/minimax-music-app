/** @vitest-environment node */

/**
 * CloneVoice unit tests — use case with mocked MiniMaxSpeechClient and MiniMaxFileClient.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloneVoiceUseCase, CloneVoiceValidationError } from './CloneVoice';
import { VoiceCloneNotVerifiedError } from '@/application/errors/VoiceCloneNotVerifiedError';
import type { IMiniMaxSpeechClient } from '@/domain/interfaces/IMiniMaxSpeechClient';
import type { IMiniMaxFileClient } from '@/domain/interfaces/IMiniMaxFileClient';
import type { FileMetadataDTO } from '@/application/dto/FileDTO';

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

function createMockFileClient(overrides: Partial<IMiniMaxFileClient> = {}): IMiniMaxFileClient {
  return {
    uploadFile: vi.fn(),
    listFiles: vi.fn(),
    getFile: vi.fn(),
    deleteFile: vi.fn(),
    retrieveContent: vi.fn(),
    ...overrides,
  } as unknown as IMiniMaxFileClient;
}

describe('CloneVoiceUseCase', () => {
  let mockSpeechClient: IMiniMaxSpeechClient;
  let mockFileClient: IMiniMaxFileClient;
  let useCase: CloneVoiceUseCase;

  beforeEach(() => {
    mockSpeechClient = createMockSpeechClient();
    mockFileClient = createMockFileClient();
    useCase = new CloneVoiceUseCase(mockSpeechClient, mockFileClient);
  });

  it('uploads file then clones voice with correct file_id', async () => {
    const mockUploadResponse: FileMetadataDTO = {
      fileId: 'file_uploaded_123',
      fileName: 'audio.mp3',
      purpose: 'voice_clone',
      size: 1024000,
      createdAt: Date.now(),
    };
    mockFileClient.uploadFile = vi.fn().mockResolvedValue(mockUploadResponse);
    mockSpeechClient.cloneVoice = vi.fn().mockResolvedValue({
      voiceId: 'my_clone_voice_1',
      name: 'My Clone',
      type: 'clone' as const,
      createdAt: Date.now(),
    });

    const audioBuffer = Buffer.from('fake audio data');
    const result = await useCase.execute({
      audioBuffer,
      fileName: 'audio.mp3',
      voiceId: 'my_clone_voice_1',
    });

    expect(mockFileClient.uploadFile).toHaveBeenCalledWith(
      audioBuffer,
      'audio.mp3',
      'voice_clone'
    );
    expect(mockSpeechClient.cloneVoice).toHaveBeenCalledWith(
      'file_uploaded_123',
      'my_clone_voice_1'
    );
    expect(result.voiceId).toBe('my_clone_voice_1');
    expect(result.type).toBe('clone');
  });

  it('throws CloneVoiceValidationError for invalid voice_id', async () => {
    const audioBuffer = Buffer.from('fake audio data');
    await expect(
      useCase.execute({
        audioBuffer,
        fileName: 'audio.mp3',
        voiceId: '123-invalid', // Must start with letter
      })
    ).rejects.toThrow(CloneVoiceValidationError);
  });

  it('throws CloneVoiceValidationError for empty voice_id', async () => {
    const audioBuffer = Buffer.from('fake audio data');
    await expect(
      useCase.execute({
        audioBuffer,
        fileName: 'audio.mp3',
        voiceId: '',
      })
    ).rejects.toThrow(CloneVoiceValidationError);
  });

  it('throws VoiceCloneNotVerifiedError when MiniMax returns code 2038', async () => {
    const error = new VoiceCloneNotVerifiedError();
    mockFileClient.uploadFile = vi.fn().mockResolvedValue({
      fileId: 'file_uploaded_123',
      fileName: 'audio.mp3',
      purpose: 'voice_clone',
      size: 1024000,
      createdAt: Date.now(),
    });
    mockSpeechClient.cloneVoice = vi.fn().mockRejectedValue(error);

    const audioBuffer = Buffer.from('fake audio data');
    await expect(
      useCase.execute({
        audioBuffer,
        fileName: 'audio.mp3',
        voiceId: 'my_clone_voice_1',
      })
    ).rejects.toThrow(VoiceCloneNotVerifiedError);
  });

  it('throws when upload fails', async () => {
    mockFileClient.uploadFile = vi.fn().mockRejectedValue(new Error('Upload failed'));

    const audioBuffer = Buffer.from('fake audio data');
    await expect(
      useCase.execute({
        audioBuffer,
        fileName: 'audio.mp3',
        voiceId: 'my_clone_voice_1',
      })
    ).rejects.toThrow('Upload failed');
  });

  it('maps clone result to VoiceDTO correctly', async () => {
    const ttlExpiry = Date.now() + 168 * 60 * 60 * 1000;
    mockFileClient.uploadFile = vi.fn().mockResolvedValue({
      fileId: 'file_123',
      fileName: 'audio.mp3',
      purpose: 'voice_clone',
      createdAt: Date.now(),
    });
    mockSpeechClient.cloneVoice = vi.fn().mockResolvedValue({
      voiceId: 'my_clone',
      name: 'My Voice Clone',
      type: 'clone' as const,
      ttlExpiry,
      createdAt: Date.now(),
    });

    const result = await useCase.execute({
      audioBuffer: Buffer.from('audio'),
      fileName: 'audio.mp3',
      voiceId: 'my_clone',
    });

    expect(result).toEqual({
      voiceId: 'my_clone',
      name: 'My Voice Clone',
      type: 'clone',
      ttlExpiry,
      createdAt: expect.any(Number),
    });
  });

  it('skips upload when preUploadedFileId is provided (fileId-based clone workflow)', async () => {
    // VoiceUpload already uploaded the file; clone route sends fileId + voiceId
    mockSpeechClient.cloneVoice = vi.fn().mockResolvedValue({
      voiceId: 'pre_uploaded_clone',
      name: 'Pre-uploaded Clone',
      type: 'clone' as const,
      createdAt: Date.now(),
    });

    const result = await useCase.execute({
      audioBuffer: Buffer.from('unused'),
      fileName: 'unused.mp3',
      voiceId: 'pre_uploaded_clone',
      preUploadedFileId: 'file_already_uploaded_123',
    });

    // uploadFile should NOT have been called
    expect(mockFileClient.uploadFile).not.toHaveBeenCalled();
    // cloneVoice should have been called with the pre-uploaded fileId
    expect(mockSpeechClient.cloneVoice).toHaveBeenCalledWith(
      'file_already_uploaded_123',
      'pre_uploaded_clone'
    );
    expect(result.voiceId).toBe('pre_uploaded_clone');
  });
});
