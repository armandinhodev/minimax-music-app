/**
 * Port interface for MiniMax File API operations.
 * Implementations are server-only and must never be bundled for the browser.
 */
export interface IMiniMaxFileClient {
  uploadFile(fileContent: Buffer, fileName: string, purpose: FilePurpose): Promise<FileMetadata>;
  listFiles(purpose?: FilePurpose): Promise<FileMetadata[]>;
  getFile(fileId: string): Promise<FileMetadata & { downloadUrl: string }>;
  deleteFile(fileId: string, purpose: FilePurpose): Promise<void>;
  retrieveContent(fileId: string): Promise<Uint8Array>;
}

export type FilePurpose =
  | 'voice_clone'
  | 'prompt_audio'
  | 't2a_async_input'
  | 't2a_async';

export interface FileMetadata {
  fileId: string;
  fileName: string;
  purpose: FilePurpose;
  size: number;
  createdAt: number; // Unix timestamp ms
}
