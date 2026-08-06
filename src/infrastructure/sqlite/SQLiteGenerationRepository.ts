import 'server-only';

import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
  CreateLibraryAssetDTO,
  CreateLibraryGenerationDTO,
  LibraryAssetDTO,
  LibraryGenerationDTO,
  LibraryGenerationKind,
  LibraryGenerationSource,
  LibrarySummaryDTO,
} from '@/application/dto/LibraryDTO';
import type { IGenerationRepository } from '@/domain/interfaces/IGenerationRepository';
import { getDatabase } from './schema';

interface GenerationRow {
  id: string;
  kind: LibraryGenerationKind;
  source: string | null;
  status: LibraryGenerationDTO['status'];
  title: string | null;
  prompt: string | null;
  model: string | null;
  provider_generation_id: string | null;
  provider_task_id: string | null;
  provider_file_id: string | null;
  metadata_json: string;
  created_at: number;
  updated_at: number;
}

interface AssetRow {
  id: string;
  kind: LibraryAssetDTO['kind'];
  storage_type: LibraryAssetDTO['storageType'];
  storage_ref: string | null;
  format: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  expires_at: number | null;
  metadata_json: string;
  created_at: number;
  generation_id?: string;
}

const EMPTY_KIND_COUNTS: Record<LibraryGenerationKind, number> = {
  tts: 0,
  music: 0,
  image: 0,
  clone: 0,
  design: 0,
};

const GENERATION_SOURCES: ReadonlySet<string> = new Set<LibraryGenerationSource>([
  'text-to-speech',
  'text-to-image',
  'image-to-image',
  'text-to-music',
  'instrumental-music',
]);

function parseGenerationSource(source: string | null): LibraryGenerationSource | null {
  if (!source) return null;
  return GENERATION_SOURCES.has(source) ? source as LibraryGenerationSource : null;
}

function parseJsonObject(json: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function stringifyJsonObject(value: Record<string, unknown> | undefined): string {
  return JSON.stringify(value ?? {});
}

function mapAsset(row: AssetRow): LibraryAssetDTO {
  return {
    id: row.id,
    kind: row.kind,
    storageType: row.storage_type,
    storageRef: row.storage_ref,
    format: row.format,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    expiresAt: row.expires_at,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
  };
}

function mapGeneration(row: GenerationRow, assets: LibraryAssetDTO[]): LibraryGenerationDTO {
  return {
    id: row.id,
    kind: row.kind,
    source: parseGenerationSource(row.source),
    status: row.status,
    title: row.title,
    prompt: row.prompt,
    model: row.model,
    providerGenerationId: row.provider_generation_id,
    providerTaskId: row.provider_task_id,
    providerFileId: row.provider_file_id,
    metadata: parseJsonObject(row.metadata_json),
    assets,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SQLiteGenerationRepository implements IGenerationRepository {
  constructor(private readonly db: Database.Database = getDatabase()) {}

  createGeneration(input: CreateLibraryGenerationDTO): LibraryGenerationDTO {
    const now = Date.now();
    const generationId = randomUUID();
    const assets = input.assets ?? [];

    const insert = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO generations (
          id, kind, source, status, title, prompt, model, provider_generation_id,
          provider_task_id, provider_file_id, metadata_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        generationId,
        input.kind,
        input.source ?? null,
        input.status ?? 'completed',
        input.title ?? null,
        input.prompt ?? null,
        input.model ?? null,
        input.providerGenerationId ?? null,
        input.providerTaskId ?? null,
        input.providerFileId ?? null,
        stringifyJsonObject(input.metadata),
        now,
        now,
      );

      for (const asset of assets) {
        this.insertAsset(generationId, asset, now);
      }
    });

    insert();

    const created = this.findGeneration(generationId);
    if (!created) throw new Error('Failed to read created generation.');

    return created;
  }

  getDashboardSummary(limit: number): LibrarySummaryDTO {
    const totalGenerations = (this.db.prepare('SELECT COUNT(*) AS count FROM generations').get() as { count: number }).count;
    const totalAssets = (this.db.prepare('SELECT COUNT(*) AS count FROM assets').get() as { count: number }).count;
    const completedGenerations = (this.db.prepare("SELECT COUNT(*) AS count FROM generations WHERE status = 'completed'").get() as { count: number }).count;
    const byKind = { ...EMPTY_KIND_COUNTS };
    const counts = this.db.prepare('SELECT kind, COUNT(*) AS count FROM generations GROUP BY kind').all() as Array<{ kind: LibraryGenerationKind; count: number }>;

    for (const row of counts) {
      byKind[row.kind] = row.count;
    }

    return {
      totalGenerations,
      totalAssets,
      completedGenerations,
      byKind,
      recentGenerations: this.listRecentGenerations(limit),
    };
  }

  listRecentGenerations(limit: number): LibraryGenerationDTO[] {
    const rows = this.db.prepare(`
      SELECT * FROM generations
      ORDER BY created_at DESC
      LIMIT ?
    `).all(Math.max(1, Math.min(limit, 100))) as GenerationRow[];

    return this.mapGenerationsWithAssets(rows);
  }

  deleteGeneration(id: string): boolean {
    const deleteGeneration = this.db.transaction(() => {
      const assetRows = this.db.prepare('SELECT asset_id AS id FROM generation_assets WHERE generation_id = ?').all(id) as Array<{ id: string }>;
      const result = this.db.prepare('DELETE FROM generations WHERE id = ?').run(id);

      for (const asset of assetRows) {
        this.db.prepare('DELETE FROM assets WHERE id = ?').run(asset.id);
      }

      return result.changes > 0;
    });

    return deleteGeneration();
  }

  private insertAsset(generationId: string, asset: CreateLibraryAssetDTO, now: number): void {
    const assetId = randomUUID();

    this.db.prepare(`
      INSERT INTO assets (
        id, kind, storage_type, storage_ref, format, mime_type, size_bytes,
        expires_at, metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assetId,
      asset.kind,
      asset.storageType,
      asset.storageRef ?? null,
      asset.format ?? null,
      asset.mimeType ?? null,
      asset.sizeBytes ?? null,
      asset.expiresAt ?? null,
      stringifyJsonObject(asset.metadata),
      now,
      now,
    );

    this.db.prepare('INSERT INTO generation_assets (generation_id, asset_id, role) VALUES (?, ?, ?)')
      .run(generationId, assetId, asset.role ?? 'primary');
  }

  private findGeneration(id: string): LibraryGenerationDTO | null {
    const row = this.db.prepare('SELECT * FROM generations WHERE id = ?').get(id) as GenerationRow | undefined;
    if (!row) return null;

    const assets = this.db.prepare(`
      SELECT assets.*
      FROM assets
      INNER JOIN generation_assets ON generation_assets.asset_id = assets.id
      WHERE generation_assets.generation_id = ?
      ORDER BY assets.created_at ASC
    `).all(id) as AssetRow[];

    return mapGeneration(row, assets.map(mapAsset));
  }

  private mapGenerationsWithAssets(rows: GenerationRow[]): LibraryGenerationDTO[] {
    if (rows.length === 0) return [];

    const generationIds = rows.map((row) => row.id);
    const placeholders = generationIds.map(() => '?').join(', ');
    const assetRows = this.db.prepare(`
      SELECT assets.*, generation_assets.generation_id
      FROM assets
      INNER JOIN generation_assets ON generation_assets.asset_id = assets.id
      WHERE generation_assets.generation_id IN (${placeholders})
      ORDER BY assets.created_at ASC
    `).all(...generationIds) as Array<AssetRow & { generation_id: string }>;
    const assetsByGeneration = new Map<string, LibraryAssetDTO[]>();

    for (const asset of assetRows) {
      const current = assetsByGeneration.get(asset.generation_id) ?? [];
      current.push(mapAsset(asset));
      assetsByGeneration.set(asset.generation_id, current);
    }

    return rows.map((row) => mapGeneration(row, assetsByGeneration.get(row.id) ?? []));
  }
}
