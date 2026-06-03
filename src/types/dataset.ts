export type SpreadsheetFileType = 'csv' | 'tsv' | 'xlsx' | 'xls' | 'unknown';
export type SpreadsheetRow = Record<string, string>;

export type ColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'mostly-blank'
  | 'binary'
  | 'category'
  | 'id-like'
  | 'mixed';

export interface ColumnProfile {
  columnName: string;
  detectedType: ColumnType;
  uniqueValueCount: number;
  blankCount: number;
  blankPercentage: number;
  sampleValues: string[];
  /** Unique values shown in dropdowns for binary/category columns */
  suggestedValues: string[];
  isRecommendedSearchable: boolean;
  warningMessage?: string;
}

export interface Dataset {
  id: string;
  fileName: string;
  sheetName: string;
  displayName: string;
  sourceType: 'file' | 'sheet';
  fileType: SpreadsheetFileType;
  importedAt: string;
  columns: string[];
  columnProfiles: ColumnProfile[];
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
  columnProfiles: ColumnProfile[];
  rows: SpreadsheetRow[];
  rowCount: number;
  previewRows: SpreadsheetRow[];
  warnings: string[];
}

export type MatchMode = 'partial' | 'exact';

export interface SearchFilters {
  query: string;
  datasetId: string;   // always a specific id — no 'all'
  column: string;      // always a specific column
  matchMode: MatchMode;
}

export interface SearchResult {
  datasetId: string;
  displayName: string;
  sheetName: string;
  rowIndex: number;
  row: SpreadsheetRow;
  matchedColumns: string[];
}
