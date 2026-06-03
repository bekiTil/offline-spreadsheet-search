import type { Dataset, SearchFilters, SearchResult } from '../types/dataset';

function isMatch(cell: string, query: string, mode: SearchFilters['matchMode']): boolean {
  const c = cell.toLocaleLowerCase();
  const q = query.trim().toLocaleLowerCase();
  if (!q) return false;
  return mode === 'exact' ? c === q : c.includes(q);
}

/**
 * Searches a single dataset on a single column.
 * Returns matching rows with the matched column noted.
 */
export function searchDataset(dataset: Dataset, filters: SearchFilters): SearchResult[] {
  const query = filters.query.trim();
  if (!query || !filters.column) return [];

  const results: SearchResult[] = [];

  dataset.rows.forEach((row, rowIndex) => {
    const cellValue = String(row[filters.column] ?? '');
    if (isMatch(cellValue, query, filters.matchMode)) {
      results.push({
        datasetId: dataset.id,
        displayName: dataset.displayName,
        sheetName: dataset.sheetName,
        rowIndex,
        row,
        matchedColumns: [filters.column],
      });
    }
  });

  return results;
}
