import { useMemo, useRef, useState } from 'react';
import { COLUMN_TYPE_LABEL, getAutocomplete } from '../services/columnProfiler';
import { searchDataset } from '../services/search';
import type { ColumnProfile, Dataset, MatchMode, SearchResult } from '../types/dataset';

interface WorkPanelProps {
  dataset: Dataset;
}

export function WorkPanel({ dataset }: WorkPanelProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>(
    dataset.searchableColumns[0] ?? '',
  );
  const [query, setQuery] = useState('');
  const [matchMode, setMatchMode] = useState<MatchMode>('partial');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Multi-select state for category / binary columns
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // All rows for browse mode
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

  const selectedProfile: ColumnProfile | undefined = useMemo(
    () => dataset.columnProfiles.find(p => p.columnName === selectedColumn),
    [dataset.columnProfiles, selectedColumn],
  );

  const isMultiSelect =
    selectedProfile?.detectedType === 'binary' ||
    selectedProfile?.detectedType === 'category';

  const resultTableColumns = useMemo(() => {
    if (!results || results.length === 0) return dataset.searchableColumns.slice(0, 10);
    const cols = new Set<string>();
    results.slice(0, 100).forEach(r => Object.keys(r.row).forEach(c => cols.add(c)));
    return [selectedColumn, ...Array.from(cols).filter(c => c !== selectedColumn)].slice(0, 10);
  }, [results, selectedColumn, dataset.searchableColumns]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleColumnSelect = (col: string) => {
    setSelectedColumn(col);
    setQuery('');
    setSelectedValues([]);
    setSearchResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Category / binary: toggle a chip value
  const toggleCategoryValue = (val: string) => {
    const next = selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val];
    setSelectedValues(next);
    if (next.length > 0) {
      setSearchResults(
        searchDataset(dataset, { query: '', datasetId: dataset.id, column: selectedColumn, matchMode: 'exact' }, next),
      );
    } else {
      setSearchResults(null);
    }
  };

  const selectAllCategories = () => {
    const all = selectedProfile?.suggestedValues ?? [];
    setSelectedValues(all);
    if (all.length > 0) {
      setSearchResults(
        searchDataset(dataset, { query: '', datasetId: dataset.id, column: selectedColumn, matchMode: 'exact' }, all),
      );
    }
  };

  const clearCategories = () => {
    setSelectedValues([]);
    setSearchResults(null);
  };

  // Text / ID / etc.
  const handleTextChange = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setSearchResults(null);
    }
    if (value.length >= 1) {
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
    setSearchResults(
      searchDataset(dataset, { query: q, datasetId: dataset.id, column: selectedColumn, matchMode }),
    );
  };

  const handleSuggestionPick = (val: string) => {
    setQuery(val);
    setSuggestions([]);
    setShowSuggestions(false);
    runSearch(val);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const noResultsLabel = isMultiSelect
    ? `No rows matched the selected ${selectedValues.length === 1 ? 'value' : 'values'}.`
    : `No rows matched "${query}" in ${selectedColumn}.`;

  return (
    <div className="work-panel">

      {/* Header */}
      <div className="work-header">
        <p className="eyebrow">Searching in</p>
        <h1 className="work-title">{dataset.displayName}</h1>
        <p className="work-meta">
          {dataset.rowCount.toLocaleString()} rows ·{' '}
          {dataset.searchableColumns.length} search{' '}
          {dataset.searchableColumns.length === 1 ? 'column' : 'columns'}
        </p>
      </div>

      {/* Step 1: Choose column */}
      <section className="work-section">
        <div className="step-heading">
          <span className="step-num">1</span>
          <span>Choose what to search by</span>
        </div>
        {dataset.searchableColumns.length === 0 ? (
          <p className="muted-note">No searchable columns saved. Remove and re-import this file.</p>
        ) : (
          <div className="col-selector-grid">
            {dataset.searchableColumns.map(col => {
              const profile = dataset.columnProfiles.find(p => p.columnName === col);
              const type = profile?.detectedType ?? 'text';
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
                  {(profile?.sampleValues ?? []).length > 0 && (
                    <span className="col-btn-sample">
                      {profile!.sampleValues.slice(0, 2).join(', ')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Step 2: Search input */}
      {selectedColumn && (
        <section className="work-section">
          <div className="step-heading">
            <span className="step-num">2</span>
            <span>
              {isMultiSelect ? 'Choose values to filter by' : 'Enter search value'}
            </span>
            {selectedProfile && (
              <span className={`type-badge type-${selectedProfile.detectedType} badge-inline`}>
                {COLUMN_TYPE_LABEL[selectedProfile.detectedType] ?? selectedProfile.detectedType}
              </span>
            )}
            {isMultiSelect && selectedValues.length > 0 && (
              <span className="selected-count">{selectedValues.length} selected</span>
            )}
          </div>

          {isMultiSelect ? (
            /* Category / Binary → multi-select chips */
            <div className="category-picker">
              <div className="category-chips">
                {(selectedProfile?.suggestedValues ?? []).map(val => {
                  const isOn = selectedValues.includes(val);
                  return (
                    <button
                      key={val}
                      className={`cat-chip${isOn ? ' on' : ''}`}
                      onClick={() => toggleCategoryValue(val)}
                    >
                      {isOn && <span className="cat-chip-check">✓</span>}
                      {val}
                    </button>
                  );
                })}
              </div>
              <div className="category-actions">
                <button className="btn-link" onClick={selectAllCategories}>Select all</button>
                <span className="cat-divider">·</span>
                <button className="btn-link" onClick={clearCategories}>Clear</button>
              </div>
            </div>
          ) : (
            /* Text / ID / Number / Date → text + autocomplete */
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
                      <button key={s} className="autocomplete-item" role="option"
                        onMouseDown={() => handleSuggestionPick(s)}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
              <select className="match-select" value={matchMode}
                onChange={e => setMatchMode(e.target.value as MatchMode)}>
                <option value="partial">Partial match</option>
                <option value="exact">Exact match</option>
              </select>
              <button className="btn btn-primary" disabled={!query.trim()} onClick={() => runSearch()}>
                Search
              </button>
            </div>
          )}
        </section>
      )}

      {/* Step 3: Results */}
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
              <p>{noResultsLabel}</p>
              {!isMultiSelect && <p className="muted-note">Try Partial match or check your spelling.</p>}
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
                        <td key={col} className={isSearched && col === selectedColumn ? 'matched-cell' : ''}>
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
