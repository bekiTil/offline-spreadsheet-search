import type { Dataset, SearchFilters, SearchResult } from '../types/dataset';

function isMatch(cell: string, query: string, mode: SearchFilters['matchMode']): boolean {
  const c = cell.toLocaleLowerCase();
  const q = query.trim().toLocaleLowerCase();
  if (!q) return false;
  return mode === 'exact' ? c === q : c.includes(q);
}

/**
 * Searches a single dataset on a single column.
 * Pass `values` for multi-select category/binary search (OR logic, always exact).
 * Pass `query` for free-text search.
 */
export function searchDataset(
  dataset: Dataset,
  filters: SearchFilters,
  values?: string[],
): SearchResult[] {
  if (!filters.column) return [];

  // Multi-value mode (category / binary)
  if (values && values.length > 0) {
    const lowerValues = values.map(v => v.toLocaleLowerCase());
    const results: SearchResult[] = [];
    dataset.rows.forEach((row, rowIndex) => {
      const cell = String(row[filters.column] ?? '').toLocaleLowerCase();
      if (lowerValues.includes(cell)) {
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

  // Single query mode (text / id / number / date)
  const query = filters.query.trim();
  if (!query) return [];

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
