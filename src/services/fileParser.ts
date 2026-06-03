import * as XLSX from 'xlsx';
import type { ParsedFilePreview, SpreadsheetFileType, SpreadsheetRow } from '../types/dataset';

const LARGE_FILE_ROW_WARNING = 25000;
const PREVIEW_LIMIT = 10;

function getFileType(fileName: string): SpreadsheetFileType {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'csv' || extension === 'tsv' || extension === 'xlsx' || extension === 'xls') {
    return extension;
  }
  return 'unknown';
}

function makeSafeHeader(rawHeader: unknown, index: number, usedHeaders: Set<string>): string {
  const base = String(rawHeader ?? '').trim() || `Column ${index + 1}`;
  let header = base;
  let duplicateNumber = 2;

  while (usedHeaders.has(header)) {
    header = `${base} ${duplicateNumber}`;
    duplicateNumber += 1;
  }

  usedHeaders.add(header);
  return header;
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function rowsFromSheet(sheet: XLSX.WorkSheet): { columns: string[]; rows: SpreadsheetRow[] } {
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  });

  if (rawRows.length === 0) {
    return { columns: [], rows: [] };
  }

  const maxColumnCount = rawRows.reduce((max, row) => Math.max(max, (row as unknown[]).length), 0);
  const headerRow = rawRows[0] ?? [];
  const usedHeaders = new Set<string>();
  const columns = Array.from({ length: maxColumnCount }, (_, index) =>
    makeSafeHeader((headerRow as unknown[])[index], index, usedHeaders),
  );

  const rows = rawRows.slice(1).map((rawRow) => {
    const row: SpreadsheetRow = {};
    columns.forEach((column, index) => {
      row[column] = normalizeCell((rawRow as unknown[])[index]);
    });
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
  const warnings: string[] = [];

  if (columns.length === 0) {
    throw new Error(`No columns found in "${displayName}". Make sure the first row contains column names.`);
  }

  if (rows.length > LARGE_FILE_ROW_WARNING) {
    warnings.push(`"${displayName}" is a large tab — saving and searching may take a little longer.`);
  }

  return {
    id: crypto.randomUUID(),
    fileName,
    sheetName,
    displayName,
    sourceType,
    fileType,
    columns,
    rows,
    rowCount: rows.length,
    previewRows: rows.slice(0, PREVIEW_LIMIT),
    warnings,
  };
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedFilePreview[]> {
  const fileType = getFileType(file.name);
  if (fileType === 'unknown') {
    throw new Error('This file type is not supported yet. Please use CSV, TSV, XLS, or XLSX.');
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    FS: fileType === 'tsv' ? '\t' : undefined,
  });

  if (workbook.SheetNames.length === 0) {
    throw new Error('This file does not contain a readable sheet.');
  }

  // CSV/TSV: always a single "sheet" — treat as a plain file
  if (fileType === 'csv' || fileType === 'tsv') {
    const sheetName = workbook.SheetNames[0]!;
    const sheet = workbook.Sheets[sheetName]!;
    return [buildPreview(file.name, '', file.name, 'file', fileType, sheet)];
  }

  // XLSX/XLS: one preview per sheet (tab)
  const isSingleSheet = workbook.SheetNames.length === 1;
  const previews: ParsedFilePreview[] = [];
  const errors: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const displayName = isSingleSheet ? file.name : `${file.name} / ${sheetName}`;
    const sourceType = isSingleSheet ? 'file' : 'sheet';

    try {
      previews.push(buildPreview(file.name, isSingleSheet ? '' : sheetName, displayName, sourceType, fileType, sheet));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Could not read tab "${sheetName}".`);
    }
  }

  if (previews.length === 0) {
    throw new Error(errors.join(' ') || 'No readable tabs found in this file.');
  }

  return previews;
}
