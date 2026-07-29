/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/application/use-cases/tts/PollAsyncT2A', () => ({
  PollAsyncT2AUseCase: vi.fn().mockImplementation(() => ({
    execute: executeMock,
  })),
}));

vi.mock('@/infrastructure/minimax/MiniMaxSpeechClient', () => ({
  MiniMaxSpeechClient: vi.fn().mockImplementation(() => ({})),
}));

describe('GET /api/minimax/async/status/[taskId]', () => {
  beforeEach(() => {
    process.env.APP_ACCESS_KEY = 'test-key';
    executeMock.mockReset();
  });

  const params = Promise.resolve({ taskId: 'task_123' });

  it('returns processing status', async () => {
    const { GET } = await import('./route');
    executeMock.mockResolvedValue({ status: 'processing', taskId: 'task_123' });

    const response = await GET(new Request('http://localhost/api/minimax/async/status/task_123', {
      headers: { Authorization: 'Bearer test-key' },
    }), { params });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'processing', taskId: 'task_123' });
  }, 10_000);

  it('returns failed status', async () => {
    const { GET } = await import('./route');
    executeMock.mockResolvedValue({ status: 'failed', taskId: 'task_123' });

    const response = await GET(new Request('http://localhost/api/minimax/async/status/task_123', {
      headers: { Authorization: 'Bearer test-key' },
    }), { params });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'failed', taskId: 'task_123' });
  });

  it('returns expired status', async () => {
    const { GET } = await import('./route');
    executeMock.mockResolvedValue({ status: 'expired', taskId: 'task_123' });

    const response = await GET(new Request('http://localhost/api/minimax/async/status/task_123', {
      headers: { Authorization: 'Bearer test-key' },
    }), { params });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'expired', taskId: 'task_123' });
  });

  it('returns success without fileId', async () => {
    const { GET } = await import('./route');
    executeMock.mockResolvedValue({ status: 'success', taskId: 'task_123' });

    const response = await GET(new Request('http://localhost/api/minimax/async/status/task_123', {
      headers: { Authorization: 'Bearer test-key' },
    }), { params });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'success', taskId: 'task_123' });
  });

  it('returns success with fileId', async () => {
    const { GET } = await import('./route');
    executeMock.mockResolvedValue({ status: 'success', taskId: 'task_123', fileId: 'file_123' });

    const response = await GET(new Request('http://localhost/api/minimax/async/status/task_123', {
      headers: { Authorization: 'Bearer test-key' },
    }), { params });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'success', taskId: 'task_123', fileId: 'file_123' });
  });
});
