import { useMemo, useRef, useState } from 'react';
import { COLUMN_TYPE_LABEL, getAutocomplete } from '../services/columnProfiler';
import { searchDataset } from '../services/search';
import type { ColumnProfile, Dataset, MatchMode, SearchResult } from '../types/dataset';

interface WorkPanelProps {
  dataset: Dataset;
}

export function WorkPanel({ dataset }: WorkPanelProps) {
  // Default to first searchable column
  const [selectedColumn, setSelectedColumn] = useState<string>(
    dataset.searchableColumns[0] ?? '',
  );
  const [query, setQuery] = useState('');
  const [matchMode, setMatchMode] = useState<MatchMode>('partial');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // All rows shown in browse mode (before any search)
  const allRows = useMemo<SearchResult[]>(
    () =>
      dataset.rows.map((row, rowIndex) => ({
        datasetId: dataset.id,
        displayName: dataset.displayName,
        sheetName: dataset.sheetName,
        rowIndex,
        row,
        matchedColumns: [],
      })),
    [dataset],
  );

  const isSearched = searchResults !== null;
  const results = isSearched ? searchResults : allRows;

  const inputRef = useRef<HTMLInputElement>(null);

  // Resolved column profile (may be undefined for old migrated data)
  const selectedProfile: ColumnProfile | undefined = useMemo(
    () => dataset.columnProfiles.find(p => p.columnName === selectedColumn),
    [dataset.columnProfiles, selectedColumn],
  );

  const isDropdown =
    selectedProfile?.detectedType === 'binary' ||
    selectedProfile?.detectedType === 'category';

  // Columns shown in results table: matched column first, then others up to 10 total
  const resultTableColumns = useMemo(() => {
    if (!results || results.length === 0) return dataset.searchableColumns.slice(0, 10);
    const cols = new Set<string>();
    results.slice(0, 100).forEach(r => Object.keys(r.row).forEach(c => cols.add(c)));
    const ordered = [selectedColumn, ...Array.from(cols).filter(c => c !== selectedColumn)];
    return ordered.slice(0, 10);
  }, [results, selectedColumn, dataset.searchableColumns]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleColumnSelect = (col: string) => {
    setSelectedColumn(col);
    setQuery('');
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleTextChange = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setSearchResults(null); // back to browse mode
    }
    if (!isDropdown && value.length >= 1) {
      const matches = getAutocomplete(dataset.rows, selectedColumn, value, 50);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const runSearch = (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q || !selectedColumn) return;
    setShowSuggestions(false);
    const res = searchDataset(dataset, {
      query: q,
      datasetId: dataset.id,
      column: selectedColumn,
      matchMode,
    });
    setSearchResults(res);
  };

  const handleSuggestionPick = (val: string) => {
    setQuery(val);
    setSuggestions([]);
    setShowSuggestions(false);
    runSearch(val);
  };

  const handleDropdownChange = (val: string) => {
    setQuery(val);
    if (val) {
      const res = searchDataset(dataset, {
        query: val,
        datasetId: dataset.id,
        column: selectedColumn,
        matchMode: 'exact',
      });
      setSearchResults(res);
    } else {
      setSearchResults(null); // back to browse mode
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="work-panel">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="work-header">
        <p className="eyebrow">Searching in</p>
        <h1 className="work-title">{dataset.displayName}</h1>
        <p className="work-meta">
          {dataset.rowCount.toLocaleString()} rows ·{' '}
          {dataset.searchableColumns.length} search{' '}
          {dataset.searchableColumns.length === 1 ? 'column' : 'columns'}
        </p>
      </div>

      {/* ── Step 1: Choose column ─────────────────────────────────────────── */}
      <section className="work-section">
        <div className="step-heading">
          <span className="step-num">1</span>
          <span>Choose what to search by</span>
        </div>

        {dataset.searchableColumns.length === 0 ? (
          <p className="muted-note">
            No searchable columns were saved for this file. Remove it and re-import
            with at least one column selected.
          </p>
        ) : (
          <div className="col-selector-grid">
            {dataset.searchableColumns.map(col => {
              const profile = dataset.columnProfiles.find(p => p.columnName === col);
              const type = profile?.detectedType ?? 'text';
              const samples = profile?.sampleValues ?? [];
              return (
                <button
                  key={col}
                  className={`col-btn${selectedColumn === col ? ' active' : ''}`}
                  onClick={() => handleColumnSelect(col)}
                >
                  <span className="col-btn-name">{col}</span>
                  <span className={`type-badge type-${type}`}>
                    {COLUMN_TYPE_LABEL[type] ?? type}
                  </span>
                  {samples.length > 0 && (
                    <span className="col-btn-sample">
                      {samples.slice(0, 2).join(', ')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Step 2: Search input ──────────────────────────────────────────── */}
      {selectedColumn && (
        <section className="work-section">
          <div className="step-heading">
            <span className="step-num">2</span>
            <span>Enter search value</span>
            {selectedProfile && (
              <span className={`type-badge type-${selectedProfile.detectedType} badge-inline`}>
                {COLUMN_TYPE_LABEL[selectedProfile.detectedType] ?? selectedProfile.detectedType}
              </span>
            )}
          </div>

          {isDropdown ? (
            /* Binary / Category → dropdown */
            <div className="search-row">
              <select
                className="search-select"
                value={query}
                onChange={e => handleDropdownChange(e.target.value)}
                autoFocus
              >
                <option value="">— Choose a value —</option>
                {(selectedProfile?.suggestedValues ?? []).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          ) : (
            /* Text / ID / Number / Date → text input + autocomplete */
            <div className="search-row">
              <div className="search-input-wrap">
                <input
                  ref={inputRef}
                  className="search-input"
                  type="text"
                  placeholder={`Search in "${selectedColumn}"…`}
                  value={query}
                  onChange={e => handleTextChange(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') runSearch();
                    if (e.key === 'Escape') setShowSuggestions(false);
                  }}
                  autoFocus
                />
                {showSuggestions && (
                  <div className="autocomplete-box" role="listbox">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        className="autocomplete-item"
                        role="option"
                        onMouseDown={() => handleSuggestionPick(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <select
                className="match-select"
                value={matchMode}
                onChange={e => setMatchMode(e.target.value as MatchMode)}
                title="Match mode"
              >
                <option value="partial">Partial match</option>
                <option value="exact">Exact match</option>
              </select>

              <button
                className="btn btn-primary"
                disabled={!query.trim()}
                onClick={() => runSearch()}
              >
                Search
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Step 3: Results (always visible) ──────────────────────────────── */}
      {selectedColumn && (
        <section className="work-section">
          <div className="step-heading">
            <span className="step-num">3</span>
            <span>{isSearched ? 'Results' : 'All rows'}</span>
            <span className="result-badge">
              {isSearched
                ? `${results.length.toLocaleString()} ${results.length === 1 ? 'match' : 'matches'}`
                : `${results.length.toLocaleString()} ${results.length === 1 ? 'row' : 'rows'} total`}
            </span>
          </div>

          {isSearched && results.length === 0 ? (
            <div className="no-results">
              <p>No rows matched "<strong>{query}</strong>" in <strong>{selectedColumn}</strong>.</p>
              <p className="muted-note">Try switching to Partial match, or check your spelling.</p>
            </div>
          ) : (
            <div className="table-scroll results-scroll">
              <table className="data-table results-table">
                <thead>
                  <tr>
                    {resultTableColumns.map(col => (
                      <th key={col} className={isSearched && col === selectedColumn ? 'matched-col' : ''}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 500).map(result => (
                    <tr key={result.rowIndex}>
                      {resultTableColumns.map(col => (
                        <td
                          key={col}
                          className={isSearched && col === selectedColumn ? 'matched-cell' : ''}
                        >
                          {result.row[col] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.length > 500 && (
                <p className="table-note">
                  {isSearched
                    ? `Showing first 500 of ${results.length.toLocaleString()} matching rows.`
                    : `Showing first 500 of ${dataset.rowCount.toLocaleString()} rows. Search to filter.`}
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
