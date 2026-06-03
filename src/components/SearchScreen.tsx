import { useMemo, useState } from 'react';
import type { Dataset, MatchMode, SearchFilters, SearchResult } from '../types/dataset';
import { filterDatasets, searchDatasets } from '../services/search';

type SearchScreenProps = {
  datasets: Dataset[];
  onNavigate: (screen: 'home' | 'import' | 'search' | 'manage') => void;
};

// Group datasets by fileName for the filter dropdown
function groupDatasetsByFile(datasets: Dataset[]): Map<string, Dataset[]> {
  const map = new Map<string, Dataset[]>();
  for (const dataset of datasets) {
    const group = map.get(dataset.fileName) ?? [];
    group.push(dataset);
    map.set(dataset.fileName, group);
  }
  return map;
}

function getRowsForBrowsing(datasets: Dataset[], filters: SearchFilters): SearchResult[] {
  const selectedDatasets = filterDatasets(datasets, filters.datasetId);
  const rows: SearchResult[] = [];
  selectedDatasets.forEach((dataset) => {
    dataset.rows.forEach((row, rowIndex) => {
      rows.push({
        datasetId: dataset.id,
        fileName: dataset.fileName,
        sheetName: dataset.sheetName,
        displayName: dataset.displayName,
        rowIndex,
        row,
        matchedColumns: [],
      });
    });
  });
  return rows;
}

export function SearchScreen({ datasets, onNavigate }: SearchScreenProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    datasetId: 'all',
    column: 'all',
    matchMode: 'partial',
  });

  const hasQuery = filters.query.trim().length > 0;
  const fileGroups = useMemo(() => groupDatasetsByFile(datasets), [datasets]);

  const availableColumns = useMemo(() => {
    const selectedDatasets = filterDatasets(datasets, filters.datasetId);
    return Array.from(new Set(selectedDatasets.flatMap((d) => d.searchableColumns))).sort();
  }, [datasets, filters.datasetId]);

  const searchResults = useMemo(() => searchDatasets(datasets, filters), [datasets, filters]);
  const browseRows = useMemo(() => getRowsForBrowsing(datasets, filters), [datasets, filters]);
  const displayedRows = hasQuery ? searchResults : browseRows;

  const visibleColumns = useMemo(() => {
    const columns = new Set<string>();
    displayedRows.slice(0, 100).forEach((result) => {
      Object.keys(result.row).forEach((column) => columns.add(column));
    });
    return Array.from(columns).slice(0, 12);
  }, [displayedRows]);

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'datasetId' ? { column: 'all' as const } : {}),
    }));
  };

  if (datasets.length === 0) {
    return (
      <section className="screen">
        <div className="empty-state large">
          <h1>No imported files yet</h1>
          <p>Add spreadsheet files first, then come back here to search.</p>
          <button className="button button-primary" type="button" onClick={() => onNavigate('import')}>
            Add Files
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Search</p>
          <h1>Search imported files</h1>
          <p>Imported rows are shown first. Type to filter. You can search all tabs, all tabs from one file, or a specific tab.</p>
        </div>
        <button className="button button-soft" type="button" onClick={() => onNavigate('home')}>Back Home</button>
      </div>

      <div className="file-overview-grid">
        {datasets.slice(0, 4).map((dataset) => (
          <article className="mini-file-card" key={dataset.id}>
            <strong>{dataset.displayName}</strong>
            <span>{dataset.rowCount.toLocaleString()} rows</span>
          </article>
        ))}
        {datasets.length > 4 && (
          <article className="mini-file-card muted">+{datasets.length - 4} more tab(s)</article>
        )}
      </div>

      <div className="search-panel">
        <label className="field field-wide">
          <span>Search text</span>
          <input
            autoFocus
            placeholder="Type a name, ID, phone number, code..."
            value={filters.query}
            onChange={(event) => updateFilter('query', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Tab / File</span>
          <select value={filters.datasetId} onChange={(event) => updateFilter('datasetId', event.target.value)}>
            <option value="all">All Files</option>
            {Array.from(fileGroups.entries()).map(([fileName, sheets]) => (
              <optgroup key={fileName} label={fileName}>
                {sheets.length > 1 && (
                  <option value={`file:${fileName}`}>All tabs in this file</option>
                )}
                {sheets.map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.sheetName ? `Tab: ${dataset.sheetName}` : dataset.fileName}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Column</span>
          <select value={filters.column} onChange={(event) => updateFilter('column', event.target.value)}>
            <option value="all">All Searchable Columns</option>
            {availableColumns.map((column) => (
              <option key={column} value={column}>{column}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Match</span>
          <select value={filters.matchMode} onChange={(event) => updateFilter('matchMode', event.target.value as MatchMode)}>
            <option value="partial">Partial</option>
            <option value="exact">Exact</option>
          </select>
        </label>
      </div>

      <div className="result-summary">
        {hasQuery
          ? `${searchResults.length.toLocaleString()} matching row(s)`
          : `Showing imported rows before search: ${browseRows.length.toLocaleString()} total row(s)`}
      </div>

      {hasQuery && searchResults.length === 0 && (
        <div className="empty-state">No results found. Try Partial match or search All Searchable Columns.</div>
      )}

      {displayedRows.length > 0 && (
        <div className="table-wrap results-table">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                {hasQuery && <th>Matched Column</th>}
                {visibleColumns.map((column) => <th key={column}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {displayedRows.slice(0, 500).map((result) => (
                <tr key={`${result.datasetId}-${result.rowIndex}-${hasQuery ? 'match' : 'browse'}`}>
                  <td>{result.displayName}</td>
                  {hasQuery && <td>{result.matchedColumns.join(', ')}</td>}
                  {visibleColumns.map((column) => <td key={column}>{result.row[column] ?? ''}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {displayedRows.length > 500 && (
            <p className="small-note table-note">
              Showing first 500 rows. Type a search value or choose a specific tab to narrow the list.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
