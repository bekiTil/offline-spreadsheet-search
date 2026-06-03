import * as XLSX from 'xlsx';
import { profileColumns } from './columnProfiler';
import type { ParsedFilePreview, SpreadsheetFileType, SpreadsheetRow } from '../types/dataset';

const PREVIEW_LIMIT = 8;
const LARGE_ROW_WARNING = 25_000;

function getFileType(fileName: string): SpreadsheetFileType {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'csv' || ext === 'tsv' || ext === 'xlsx' || ext === 'xls') return ext;
  return 'unknown';
}

function makeSafeHeader(raw: unknown, index: number, used: Set<string>): string {
  const base = String(raw ?? '').trim() || `Column ${index + 1}`;
  let header = base;
  let n = 2;
  while (used.has(header)) { header = `${base} ${n}`; n++; }
  used.add(header);
  return header;
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function rowsFromSheet(sheet: XLSX.WorkSheet): { columns: string[]; rows: SpreadsheetRow[] } {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1, defval: '', blankrows: false, raw: false,
  }) as unknown[][];

  if (raw.length === 0) return { columns: [], rows: [] };

  const maxCols = raw.reduce((m, r) => Math.max(m, (r as unknown[]).length), 0);
  const headerRow = raw[0] as unknown[];
  const used = new Set<string>();
  const columns = Array.from({ length: maxCols }, (_, i) =>
    makeSafeHeader(headerRow[i], i, used),
  );

  const rows: SpreadsheetRow[] = (raw.slice(1) as unknown[][]).map(rawRow => {
    const row: SpreadsheetRow = {};
    columns.forEach((col, i) => { row[col] = normalizeCell((rawRow as unknown[])[i]); });
    return row;
  });

  return { columns, rows };
}

function buildPreview(
  fileName: string,
  sheetName: string,
  displayName: string,
  sourceType: 'file' | 'sheet',
  fileType: SpreadsheetFileType,
  sheet: XLSX.WorkSheet,
): ParsedFilePreview {
  const { columns, rows } = rowsFromSheet(sheet);

  if (columns.length === 0) {
    throw new Error(
      `No columns found in "${displayName}". Make sure the first row contains column headers.`,
    );
  }

  const columnProfiles = profileColumns(rows, columns);
  const warnings: string[] = [];
  if (rows.length > LARGE_ROW_WARNING) {
    warnings.push(
      `Large file (${rows.length.toLocaleString()} rows) — saving and searching may be slower than usual.`,
    );
  }

  return {
    id: crypto.randomUUID(),
    fileName,
    sheetName,
    displayName,
    sourceType,
    fileType,
    columns,
    columnProfiles,
    rows,
    rowCount: rows.length,
    previewRows: rows.slice(0, PREVIEW_LIMIT),
    warnings,
  };
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedFilePreview[]> {
  const fileType = getFileType(file.name);
  if (fileType === 'unknown') {
    throw new Error(
      'Unsupported file type. Please use CSV, TSV, XLS, or XLSX.',
    );
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    FS: fileType === 'tsv' ? '\t' : undefined,
  });

  if (workbook.SheetNames.length === 0) {
    throw new Error('This file does not contain any readable sheets.');
  }

  // CSV / TSV: always a single table
  if (fileType === 'csv' || fileType === 'tsv') {
    const sheetName = workbook.SheetNames[0]!;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error('Could not read file contents.');
    return [buildPreview(file.name, '', file.name, 'file', fileType, sheet)];
  }

  // XLS / XLSX: one entry per sheet tab
  const isSingle = workbook.SheetNames.length === 1;
  const previews: ParsedFilePreview[] = [];
  const errors: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const displayName = isSingle ? file.name : `${file.name} / ${sheetName}`;
    const sourceType: 'file' | 'sheet' = isSingle ? 'file' : 'sheet';
    try {
      previews.push(
        buildPreview(file.name, isSingle ? '' : sheetName, displayName, sourceType, fileType, sheet),
      );
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `Could not read tab "${sheetName}".`);
    }
  }

  if (previews.length === 0) {
    throw new Error(errors.join(' ') || 'No readable tabs found in this file.');
  }

  return previews;
}
