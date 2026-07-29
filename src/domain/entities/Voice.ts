/**
 * Voice entity — represents a MiniMax voice (system or user-owned).
 * Cloned/designed voices have a TTL (time-to-live) expiry.
 */
export interface Voice {
  readonly voiceId: string;
  readonly name: string;
  readonly language?: string;
  readonly type: VoiceType;
  readonly ttlExpiry?: number; // Unix timestamp ms; present only for cloned/designed voices
  readonly createdAt: number; // Unix timestamp ms
  /** Hex-encoded trial audio returned by voice design (base64 decoded to hex). */
  readonly trialAudioHex?: string;
}

export type VoiceType = 'system' | 'clone' | 'design';
