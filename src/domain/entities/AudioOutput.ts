/**
 * AudioOutput entity — represents synthesized audio output.
 * downloadUrl may expire (9-hour MiniMax URL TTL).
 */
export interface AudioOutput {
  readonly id: string; // uuid
  readonly format: import('../value-objects/AudioFormat').AudioFormat;
  readonly duration?: number; // seconds, if known
  readonly downloadUrl: string;
  readonly expiresAt?: number; // Unix timestamp ms; absent for streaming responses
  /** Hex-encoded audio returned directly by MiniMax sync T2A (base64 decoded to hex). */
  readonly audioHex?: string;
}
