import type { AudioFormat } from './AudioFormat';

export const DEFAULT_T2A_MODEL = 'speech-2.8-hd' as const;
export const DEFAULT_T2A_FORMAT: AudioFormat = 'mp3';

export interface T2APolicy {
  model: string;
  format: AudioFormat;
}

export interface T2ARequest {
  text: string;
  voiceId: string;
  model?: string;
  format?: AudioFormat;
}
