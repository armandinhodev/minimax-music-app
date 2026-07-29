export const VOICE_CLONE_NOT_VERIFIED_CODE = 2038;

/**
 * Voice cloning requires account verification.
 * Safe to import from application, domain, infrastructure, and route layers.
 */
export class VoiceCloneNotVerifiedError extends Error {
  readonly code = VOICE_CLONE_NOT_VERIFIED_CODE;

  constructor() {
    super('Voice cloning requires account verification.');
    this.name = 'VoiceCloneNotVerifiedError';
  }
}
