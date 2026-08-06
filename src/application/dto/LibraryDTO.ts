export type LibraryGenerationKind = 'tts' | 'music' | 'image' | 'clone' | 'design';
export type LibraryGenerationSource = 'text-to-speech' | 'text-to-image' | 'image-to-image' | 'text-to-music' | 'instrumental-music';
export type LibraryAssetKind = 'audio' | 'image' | 'voice' | 'metadata';
export type LibraryAssetStorageType = 'provider_url' | 'provider_file' | 'browser_indexeddb' | 'metadata_only';
export type LibraryGenerationStatus = 'completed' | 'failed' | 'processing';

export interface LibraryAssetDTO {
  id: string;
  kind: LibraryAssetKind;
  storageType: LibraryAssetStorageType;
  storageRef: string | null;
  format: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  expiresAt: number | null;
  metadata: Record<string, unknown>;
  createdAt: number;
}

export interface LibraryGenerationDTO {
  id: string;
  kind: LibraryGenerationKind;
  source: LibraryGenerationSource | null;
  status: LibraryGenerationStatus;
  title: string | null;
  prompt: string | null;
  model: string | null;
  providerGenerationId: string | null;
  providerTaskId: string | null;
  providerFileId: string | null;
  metadata: Record<string, unknown>;
  assets: LibraryAssetDTO[];
  createdAt: number;
  updatedAt: number;
}

export interface LibrarySummaryDTO {
  totalGenerations: number;
  totalAssets: number;
  completedGenerations: number;
  byKind: Record<LibraryGenerationKind, number>;
  recentGenerations: LibraryGenerationDTO[];
}

export interface CreateLibraryAssetDTO {
  kind: LibraryAssetKind;
  storageType: LibraryAssetStorageType;
  storageRef?: string | null;
  format?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  expiresAt?: number | null;
  metadata?: Record<string, unknown>;
  role?: string;
}

export interface CreateLibraryGenerationDTO {
  kind: LibraryGenerationKind;
  source?: LibraryGenerationSource | null;
  status?: LibraryGenerationStatus;
  title?: string | null;
  prompt?: string | null;
  model?: string | null;
  providerGenerationId?: string | null;
  providerTaskId?: string | null;
  providerFileId?: string | null;
  metadata?: Record<string, unknown>;
  assets?: CreateLibraryAssetDTO[];
}
