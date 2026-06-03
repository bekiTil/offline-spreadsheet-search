import type { Dataset, SearchFilters, SearchResult } from '../types/dataset';

function normalize(value: string): string {
  return value.toLocaleLowerCase();
}

function isMatch(cellValue: string, query: string, matchMode: SearchFilters['matchMode']): boolean {
  const normalizedCell = normalize(cellValue);
  const normalizedQuery = normalize(query.trim());

  if (!normalizedQuery) return false;
  if (matchMode === 'exact') return normalizedCell === normalizedQuery;
  return normalizedCell.includes(normalizedQuery);
}

export function filterDatasets(datasets: Dataset[], datasetId: SearchFilters['datasetId']): Dataset[] {
  if (datasetId === 'all') return datasets;
  if (datasetId.startsWith('file:')) {
    const fileName = datasetId.slice(5);
    return datasets.filter((d) => d.fileName === fileName);
  }
  return datasets.filter((d) => d.id === datasetId);
}

export function searchDatasets(datasets: Dataset[], filters: SearchFilters): SearchResult[] {
  const query = filters.query.trim();
  if (!query) return [];

  const selectedDatasets = filterDatasets(datasets, filters.datasetId);
  const results: SearchResult[] = [];

  selectedDatasets.forEach((dataset) => {
    const columnsToSearch = filters.column === 'all'
      ? dataset.searchableColumns
      : dataset.searchableColumns.includes(filters.column)
        ? [filters.column]
        : [];

    dataset.rows.forEach((row, rowIndex) => {
      const matchedColumns = columnsToSearch.filter((column) => isMatch(row[column] ?? '', query, filters.matchMode));

      if (matchedColumns.length > 0) {
        results.push({
          datasetId: dataset.id,
          fileName: dataset.fileName,
          sheetName: dataset.sheetName,
          displayName: dataset.displayName,
          rowIndex,
          row,
          matchedColumns,
        });
      }
    });
  });

  return results;
}
