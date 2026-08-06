import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

type DatabaseConnection = Database.Database;

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const DEFAULT_DATABASE_PATH = path.join(process.cwd(), 'data', 'minimax.sqlite');

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'create_library_metadata',
    sql: `
      CREATE TABLE IF NOT EXISTS generations (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('tts', 'music', 'image', 'clone', 'design')),
        source TEXT,
        status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'processing')),
        title TEXT,
        prompt TEXT,
        model TEXT,
        provider_generation_id TEXT,
        provider_task_id TEXT,
        provider_file_id TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('audio', 'image', 'voice', 'metadata')),
        storage_type TEXT NOT NULL CHECK (storage_type IN ('provider_url', 'provider_file', 'browser_indexeddb', 'metadata_only')),
        storage_ref TEXT,
        format TEXT,
        mime_type TEXT,
        size_bytes INTEGER,
        expires_at INTEGER,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS generation_assets (
        generation_id TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'primary',
        PRIMARY KEY (generation_id, asset_id),
        FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_generations_kind_created_at ON generations(kind, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_generations_status_created_at ON generations(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_assets_kind_created_at ON assets(kind, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_assets_expires_at ON assets(expires_at);
      CREATE INDEX IF NOT EXISTS idx_generation_assets_asset_id ON generation_assets(asset_id);
    `,
  },
];

let connection: DatabaseConnection | null = null;
let connectionPath: string | null = null;

export function getDatabasePath(): string {
  const configuredPath = process.env.MINIMAX_SQLITE_PATH?.trim();
  if (configuredPath) return path.resolve(configuredPath);
  if (process.env.VITEST) return ':memory:';

  return DEFAULT_DATABASE_PATH;
}

function ensureDatabaseDirectory(databasePath: string): void {
  if (databasePath === ':memory:') return;
  const directory = path.dirname(databasePath);
  fs.mkdirSync(directory, { recursive: true });
}

function ensureMigrationTable(db: DatabaseConnection): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);
}

export function migrateDatabase(db: DatabaseConnection): void {
  ensureMigrationTable(db);
  const applied = db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>;
  const appliedVersions = new Set(applied.map((row) => row.version));

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;

    const applyMigration = db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, migration.name, Date.now());
    });

    applyMigration();
  }
}

export function getDatabase(): DatabaseConnection {
  const databasePath = getDatabasePath();
  if (connection && connectionPath === databasePath) return connection;

  connection?.close();
  ensureDatabaseDirectory(databasePath);
  connection = new Database(databasePath);
  connection.pragma('foreign_keys = ON');
  migrateDatabase(connection);
  connectionPath = databasePath;

  return connection;
}

export function closeDatabaseConnection(): void {
  connection?.close();
  connection = null;
  connectionPath = null;
}
