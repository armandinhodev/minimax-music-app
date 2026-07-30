/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/application/use-cases/image/GenerateImage', () => ({
  GenerateImageUseCase: vi.fn().mockImplementation(() => ({
    execute: executeMock,
  })),
}));

vi.mock('@/infrastructure/minimax/MiniMaxImageClient', () => ({
  MiniMaxImageClient: vi.fn().mockImplementation(() => ({})),
}));

describe('POST /api/minimax/image', () => {
  beforeEach(() => {
    process.env.APP_ACCESS_KEY = 'test-key';
    executeMock.mockReset();
  });

  it('validates and returns generated image URLs', async () => {
    const { POST } = await import('./route');
    executeMock.mockResolvedValue({
      id: 'generation-1',
      imageUrls: ['https://example.com/image.png'],
      metadata: { successCount: 1, failedCount: 0 },
      expiresAt: 123,
    });

    const response = await POST(new Request('http://localhost/api/minimax/image', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A polished product photo.',
        aspectRatio: '16:9',
        n: 2,
        seed: 42,
        promptOptimizer: true,
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: 'generation-1',
      imageUrls: ['https://example.com/image.png'],
      metadata: { successCount: 1, failedCount: 0 },
      expiresAt: 123,
    });
    expect(executeMock).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'A polished product photo.',
      aspectRatio: '16:9',
      responseFormat: 'url',
      n: 2,
      seed: 42,
      promptOptimizer: true,
    }));
  });

  it('passes image-to-image subject references to the use case', async () => {
    const { POST } = await import('./route');
    const referenceImageDataUrl = `data:image/png;base64,${Buffer.from('portrait').toString('base64')}`;
    executeMock.mockResolvedValue({
      id: 'generation-i2i',
      imageUrls: ['https://example.com/image.png'],
      metadata: { successCount: 1, failedCount: 0 },
      expiresAt: 123,
    });

    const response = await POST(new Request('http://localhost/api/minimax/image', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Create an editorial portrait.',
        subjectReference: [{ type: 'character', imageFile: referenceImageDataUrl }],
        responseFormat: 'url',
      }),
    }));

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'Create an editorial portrait.',
      subjectReference: [{ type: 'character', imageFile: referenceImageDataUrl }],
      responseFormat: 'url',
    }));
  });

  it('rejects invalid image-to-image reference images before calling MiniMax', async () => {
    const { POST } = await import('./route');

    const response = await POST(new Request('http://localhost/api/minimax/image', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Create an editorial portrait.',
        subjectReference: [{ type: 'character', imageFile: 'data:image/gif;base64,AAAA' }],
      }),
    }));

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('rejects invalid image requests before calling MiniMax', async () => {
    const { POST } = await import('./route');

    const response = await POST(new Request('http://localhost/api/minimax/image', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: '', n: 10 }),
    }));

    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });
});
