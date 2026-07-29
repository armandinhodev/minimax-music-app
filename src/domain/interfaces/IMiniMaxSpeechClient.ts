import type { Voice } from '../entities/Voice';
import type { AudioOutput } from '../entities/AudioOutput';
import type { T2ATask } from '../entities/T2ATask';
import type { VoiceId } from '../value-objects/VoiceId';
import type { TaskStatus } from '../value-objects/TaskStatus';
import type { T2ARequest } from '../value-objects/T2APolicy';

/**
 * Port interface for all MiniMax T2A (text-to-audio) and voice operations.
 * Implementations are server-only and must never be bundled for the browser.
 */
export interface IMiniMaxSpeechClient {
  // T2A operations
  synthesize(request: T2ARequest): Promise<AudioOutput>;
  stream(text: string, voiceId: string, model?: string): Promise<ReadableStream>;
  submitAsync(request: T2ARequest): Promise<T2ATask>;
  pollTask(taskId: string): Promise<{ status: TaskStatus; fileId?: string }>;

  // Voice operations
  getVoices(): Promise<Voice[]>;
  cloneVoice(
    fileId: string,
    voiceId: string,
    options?: {
      optionalClonePrompt?: { promptAudio: string; promptText?: string };
      optionalPreviewText?: string;
      optionalModel?: string;
    }
  ): Promise<Voice>;
  designVoice(prompt: string, previewText: string): Promise<Voice>;
  deleteVoice(voiceId: VoiceId, voiceType?: 'voice_cloning' | 'voice_generation'): Promise<void>;
}
