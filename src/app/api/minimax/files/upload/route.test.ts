/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock('@/application/use-cases/file/UploadFile', () => ({
  UploadFileUseCase: vi.fn().mockImplementation(() => ({
    execute: executeMock,
  })),
}));

vi.mock('@/infrastructure/minimax/MiniMaxFileClient', () => ({
  MiniMaxFileClient: vi.fn().mockImplementation(() => ({})),
}));

describe('POST /api/minimax/files/upload', () => {
  const createMockFile = (bytes: Uint8Array, name: string, type: string) => {
    const file = new File([], name, { type });
    Object.defineProperty(file, 'size', { value: bytes.length });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
    });
    return file;
  };

  const createMockRequest = (file: File, purpose: string, headers: Record<string, string> = {}) => {
    const formData = vi.fn().mockResolvedValue({
      get: (name: string) => {
        if (name === 'file') return file;
        if (name === 'purpose') return purpose;
        return null;
      },
    });

    return {
      headers: {
        get: (name: string) => headers[name] ?? headers[name.toLowerCase()] ?? null,
      },
      formData,
    } as unknown as Request & { formData: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    process.env.APP_ACCESS_KEY = 'test-key';
    executeMock.mockReset().mockResolvedValue({
      fileId: 'file_123',
      fileName: 'sample.wav',
      purpose: 'voice_clone',
      size: 12,
      createdAt: 123,
    });
  });

  it('accepts chunked uploads without Content-Length', async () => {
    const { POST } = await import('./route');
    const file = createMockFile(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]), 'sample.wav', 'audio/wav');
    const request = createMockRequest(file, 'voice_clone', {
      authorization: 'Bearer test-key',
      'transfer-encoding': 'chunked',
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(request.formData).toHaveBeenCalled();
    expect(executeMock).toHaveBeenCalled();
  });

  it('rejects spoofed MP3 uploads whose bytes are not audio', async () => {
    const { POST } = await import('./route');
    const file = createMockFile(new TextEncoder().encode('not really an mp3'), 'sample.mp3', 'audio/mpeg');

    const response = await POST(createMockRequest(file, 'voice_clone', {
      authorization: 'Bearer test-key',
      'content-length': '128',
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'File content does not match MP3 audio.' });
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('rejects TXT uploads with binary content', async () => {
    const { POST } = await import('./route');
    const file = createMockFile(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), 'script.txt', 'text/plain');

    const response = await POST(createMockRequest(file, 't2a_async_input', {
      authorization: 'Bearer test-key',
      'content-length': '128',
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'TXT uploads must contain plain text content.' });
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('accepts valid WAV uploads and forwards the buffer to the use case', async () => {
    const { POST } = await import('./route');
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]);
    const file = createMockFile(bytes, 'sample.wav', 'audio/wav');

    const response = await POST(createMockRequest(file, 'voice_clone', {
      authorization: 'Bearer test-key',
      'content-length': '128',
    }));

    expect(response.status).toBe(200);
    expect(executeMock).toHaveBeenCalledWith({
      fileBuffer: Buffer.from(bytes),
      fileName: 'sample.wav',
      purpose: 'voice_clone',
    });
  });
});
