export type SpreadsheetFileType = 'csv' | 'tsv' | 'xlsx' | 'xls' | 'unknown';

export type SpreadsheetRow = Record<string, string>;

export interface Dataset {
  id: string;
  fileName: string;
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
  datasetId: 'all' | string;
  column: 'all' | string;
  matchMode: MatchMode;
}

export interface SearchResult {
  datasetId: string;
  fileName: string;
  rowIndex: number;
  row: SpreadsheetRow;
  matchedColumns: string[];
}
