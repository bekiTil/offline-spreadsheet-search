import { openDB, type DBSchema } from 'idb';
import type { Dataset } from '../types/dataset';

interface SpreadsheetSearchDB extends DBSchema {
  datasets: {
    key: string;
    value: Dataset;
    indexes: { 'by-importedAt': string };
  };
}

const DB_NAME = 'offline-spreadsheet-search';
const DB_VERSION = 2;

const dbPromise = openDB<SpreadsheetSearchDB>(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    // Only create the object store on a fresh install.
    // v1 → v2 keeps the same store; new fields are backfilled at read time.
    if (oldVersion < 1) {
      const store = db.createObjectStore('datasets', { keyPath: 'id' });
      store.createIndex('by-importedAt', 'importedAt');
    }
  },
});

/** Backfill fields added in schema v2 so old records still work. */
function migrateDataset(raw: Dataset): Dataset {
  return {
    ...raw,
    sheetName: raw.sheetName ?? '',
    displayName: raw.displayName ?? raw.fileName,
    sourceType: raw.sourceType ?? 'file',
    columnProfiles: raw.columnProfiles ?? [],
  };
}

export async function saveDataset(dataset: Dataset): Promise<void> {
  const db = await dbPromise;
  await db.put('datasets', dataset);
}

export async function getDatasets(): Promise<Dataset[]> {
  const db = await dbPromise;
  const raw = await db.getAll('datasets');
  return raw
    .map(migrateDataset)
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

export async function getDataset(id: string): Promise<Dataset | undefined> {
  const db = await dbPromise;
  const raw = await db.get('datasets', id);
  return raw ? migrateDataset(raw) : undefined;
}

export async function deleteDataset(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete('datasets', id);
}

export async function clearAllDatasets(): Promise<void> {
  const db = await dbPromise;
  await db.clear('datasets');
}
