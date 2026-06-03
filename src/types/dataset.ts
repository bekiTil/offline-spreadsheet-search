export type SpreadsheetFileType = 'csv' | 'tsv' | 'xlsx' | 'xls' | 'unknown';

export type SpreadsheetRow = Record<string, string>;

export interface Dataset {
  id: string;
  fileName: string;
  sheetName: string;       // empty string for csv/tsv
  displayName: string;     // "file.xlsx / SheetName" or "file.csv"
  sourceType: 'file' | 'sheet';
  fileType: SpreadsheetFileType;
  importedAt: string;
  columns: string[];
  searchableColumns: string[];
  rows: SpreadsheetRow[];
  rowCount: number;
}

export interface ParsedFilePreview {
  id: string;
  fileName: string;
  sheetName: string;
  displayName: string;
  sourceType: 'file' | 'sheet';
  fileType: SpreadsheetFileType;
  columns: string[];
  rows: SpreadsheetRow[];
  rowCount: number;
  previewRows: SpreadsheetRow[];
  warnings: string[];
}

export type MatchMode = 'partial' | 'exact';

export interface SearchFilters {
  query: string;
  // 'all' | 'file:{fileName}' (all tabs from one file) | specific dataset id
  datasetId: 'all' | string;
  column: 'all' | string;
  matchMode: MatchMode;
}

export interface SearchResult {
  datasetId: string;
  fileName: string;
  sheetName: string;
  displayName: string;
  rowIndex: number;
  row: SpreadsheetRow;
  matchedColumns: string[];
}
