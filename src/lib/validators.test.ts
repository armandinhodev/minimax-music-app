/** @vitest-environment node */

/**
 * Validators unit tests — Zod schema validation for all request DTOs.
 */

import { describe, it, expect } from 'vitest';
import {
  T2ARequestSchema,
  T2AStreamRequestSchema,
  AsyncT2ASubmitSchema,
  CloneVoiceSchema,
  DesignVoiceSchema,
  GetVoicesSchema,
  DeleteVoiceSchema,
  GetFileSchema,
  DeleteFileSchema,
} from '@/lib/validators';

describe('T2ARequestSchema', () => {
  it('accepts valid T2A request', () => {
    const result = T2ARequestSchema.safeParse({
      text: 'Hello world',
      voiceId: 'sys_male_english_1',
      model: 'speech-2.8-hd',
      format: 'mp3',
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal valid request with defaults', () => {
    const result = T2ARequestSchema.safeParse({
      text: 'Hello world',
      voiceId: 'sys_male_english_1',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe('speech-2.8-hd');
      expect(result.data.format).toBe('mp3');
    }
  });

  it('rejects empty text', () => {
    const result = T2ARequestSchema.safeParse({
      text: '',
      voiceId: 'sys_male_english_1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects text exceeding 10,000 characters', () => {
    const result = T2ARequestSchema.safeParse({
      text: 'a'.repeat(10001),
      voiceId: 'sys_male_english_1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid voice_id format', () => {
    const result = T2ARequestSchema.safeParse({
      text: 'Hello',
      voiceId: '123-invalid', // must start with letter
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid format', () => {
    const result = T2ARequestSchema.safeParse({
      text: 'Hello',
      voiceId: 'sys_male_english_1',
      format: 'invalid_format',
    });
    expect(result.success).toBe(false);
  });
});

describe('T2AStreamRequestSchema', () => {
  it('accepts valid stream request', () => {
    const result = T2AStreamRequestSchema.safeParse({
      text: 'Streaming text',
      voiceId: 'sys_female_english_1',
      model: 'speech-2.8',
    });
    expect(result.success).toBe(true);
  });

  it('rejects text exceeding 10,000 characters', () => {
    const result = T2AStreamRequestSchema.safeParse({
      text: 'a'.repeat(10001),
      voiceId: 'sys_male_english_1',
    });
    expect(result.success).toBe(false);
  });
});

describe('AsyncT2ASubmitSchema', () => {
  it('accepts valid async submit request', () => {
    const result = AsyncT2ASubmitSchema.safeParse({
      text: 'Long text up to 1M chars',
      voiceId: 'sys_male_english_1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts text up to 1,000,000 characters', () => {
    const result = AsyncT2ASubmitSchema.safeParse({
      text: 'a'.repeat(1_000_000),
      voiceId: 'sys_male_english_1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects text exceeding 1,000,000 characters', () => {
    const result = AsyncT2ASubmitSchema.safeParse({
      text: 'a'.repeat(1_000_001),
      voiceId: 'sys_male_english_1',
    });
    expect(result.success).toBe(false);
  });
});

describe('CloneVoiceSchema', () => {
  it('accepts valid clone voice request', () => {
    const result = CloneVoiceSchema.safeParse({
      fileId: 'file_abc123',
      voiceId: 'my_clone_voice_1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional clone prompt fields', () => {
    const result = CloneVoiceSchema.safeParse({
      fileId: 'file_abc123',
      voiceId: 'my_clone_voice_1',
      optionalClonePrompt: {
        promptAudio: 'file_prompt_123',
        promptText: 'Hello world',
      },
      optionalPreviewText: 'Preview text',
      optionalModel: 'speech-2.8-hd',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty fileId', () => {
    const result = CloneVoiceSchema.safeParse({
      fileId: '',
      voiceId: 'my_clone_voice_1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid voice_id format', () => {
    const result = CloneVoiceSchema.safeParse({
      fileId: 'file_abc123',
      voiceId: '-invalid', // must start with letter
    });
    expect(result.success).toBe(false);
  });
});

describe('DesignVoiceSchema', () => {
  it('accepts valid design voice request', () => {
    const result = DesignVoiceSchema.safeParse({
      prompt: 'A warm female voice with a British accent',
      previewText: 'Hello world',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty prompt', () => {
    const result = DesignVoiceSchema.safeParse({
      prompt: '',
      previewText: 'Hello',
    });
    expect(result.success).toBe(false);
  });

  it('rejects prompt exceeding 2000 characters', () => {
    const result = DesignVoiceSchema.safeParse({
      prompt: 'a'.repeat(2001),
      previewText: 'Hello',
    });
    expect(result.success).toBe(false);
  });

  it('rejects preview text exceeding 500 characters', () => {
    const result = DesignVoiceSchema.safeParse({
      prompt: 'A warm female voice',
      previewText: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('GetVoicesSchema', () => {
  it('accepts valid voice type enum values', () => {
    const types = ['system', 'voice_cloning', 'voice_generation', 'all'] as const;
    for (const voiceType of types) {
      const result = GetVoicesSchema.safeParse({ voiceType });
      expect(result.success).toBe(true);
    }
  });

  it('defaults to all', () => {
    const result = GetVoicesSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.voiceType).toBe('all');
    }
  });

  it('rejects invalid voice type', () => {
    const result = GetVoicesSchema.safeParse({ voiceType: 'invalid' });
    expect(result.success).toBe(false);
  });
});

describe('DeleteVoiceSchema', () => {
  it('accepts valid delete voice request', () => {
    const result = DeleteVoiceSchema.safeParse({
      voiceId: 'clone_voice_123',
      voiceType: 'voice_cloning',
    });
    expect(result.success).toBe(true);
  });

  it('defaults voiceType to voice_cloning', () => {
    const result = DeleteVoiceSchema.safeParse({
      voiceId: 'clone_voice_123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.voiceType).toBe('voice_cloning');
    }
  });

  it('rejects invalid voice type', () => {
    const result = DeleteVoiceSchema.safeParse({
      voiceId: 'clone_voice_123',
      voiceType: 'system',
    });
    expect(result.success).toBe(false);
  });
});

describe('GetFileSchema', () => {
  it('accepts valid get file request', () => {
    const result = GetFileSchema.safeParse({ fileId: 'file_abc123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty fileId', () => {
    const result = GetFileSchema.safeParse({ fileId: '' });
    expect(result.success).toBe(false);
  });
});

describe('DeleteFileSchema', () => {
  it('accepts valid delete file request', () => {
    const result = DeleteFileSchema.safeParse({
      fileId: 'file_abc123',
      purpose: 'voice_clone',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing purpose', () => {
    const result = DeleteFileSchema.safeParse({
      fileId: 'file_abc123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid purpose', () => {
    const result = DeleteFileSchema.safeParse({
      fileId: 'file_abc123',
      purpose: 'invalid_purpose',
    });
    expect(result.success).toBe(false);
  });
});
