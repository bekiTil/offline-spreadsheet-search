import { openDB, type DBSchema } from 'idb';
import type { Dataset } from '../types/dataset';

interface SpreadsheetSearchDB extends DBSchema {
  datasets: {
    key: string;
    value: Dataset;
    indexes: {
      'by-importedAt': string;
    };
  };
}

const DB_NAME = 'offline-spreadsheet-search';
const DB_VERSION = 1;

const dbPromise = openDB<SpreadsheetSearchDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    const store = db.createObjectStore('datasets', { keyPath: 'id' });
    store.createIndex('by-importedAt', 'importedAt');
  },
});

export async function saveDataset(dataset: Dataset): Promise<void> {
  const db = await dbPromise;
  await db.put('datasets', dataset);
}

export async function getDatasets(): Promise<Dataset[]> {
  const db = await dbPromise;
  const datasets = await db.getAll('datasets');
  return datasets.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

export async function getDataset(id: string): Promise<Dataset | undefined> {
  const db = await dbPromise;
  return db.get('datasets', id);
}

export async function deleteDataset(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete('datasets', id);
}

export async function clearAllDatasets(): Promise<void> {
  const db = await dbPromise;
  await db.clear('datasets');
}
