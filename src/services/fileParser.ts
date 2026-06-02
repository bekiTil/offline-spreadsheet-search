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

  const maxColumnCount = rawRows.reduce((max, row) => Math.max(max, row.length), 0);
  const headerRow = rawRows[0] ?? [];
  const usedHeaders = new Set<string>();
  const columns = Array.from({ length: maxColumnCount }, (_, index) =>
    makeSafeHeader(headerRow[index], index, usedHeaders),
  );

  const rows = rawRows.slice(1).map((rawRow) => {
    const row: SpreadsheetRow = {};
    columns.forEach((column, index) => {
      row[column] = normalizeCell(rawRow[index]);
    });
    return row;
  });

  return { columns, rows };
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedFilePreview> {
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

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('This file does not contain a readable sheet.');
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  const { columns, rows } = rowsFromSheet(firstSheet);

  if (columns.length === 0) {
    throw new Error('No columns were found. Please make sure the first row contains column names.');
  }

  const warnings: string[] = [];
  if (rows.length > LARGE_FILE_ROW_WARNING) {
    warnings.push('This is a large file, so saving and searching may take a little longer.');
  }

  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    fileType,
    columns,
    rows,
    rowCount: rows.length,
    previewRows: rows.slice(0, PREVIEW_LIMIT),
    warnings,
  };
}
