import { useMemo, useState } from 'react';
import type { Dataset, ParsedFilePreview } from '../types/dataset';
import { parseSpreadsheetFile } from '../services/fileParser';
import { saveDataset } from '../services/storage';

type ImportScreenProps = {
  onImported: () => Promise<void>;
  onNavigate: (screen: 'home' | 'import' | 'search' | 'manage') => void;
};

type SearchColumnSelections = Record<string, string[]>;

// Group previews by fileName for display
function groupByFile(previews: ParsedFilePreview[]): Map<string, ParsedFilePreview[]> {
  const map = new Map<string, ParsedFilePreview[]>();
  for (const preview of previews) {
    const group = map.get(preview.fileName) ?? [];
    group.push(preview);
    map.set(preview.fileName, group);
  }
  return map;
}

export function ImportScreen({ onImported, onNavigate }: ImportScreenProps) {
  const [parsedPreviews, setParsedPreviews] = useState<ParsedFilePreview[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<SearchColumnSelections>({});
  const [isPreparing, setIsPreparing] = useState(false);
  const [message, setMessage] = useState<string>('');

  const totalRows = useMemo(() => parsedPreviews.reduce((sum, p) => sum + p.rowCount, 0), [parsedPreviews]);
  const fileGroups = useMemo(() => groupByFile(parsedPreviews), [parsedPreviews]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsPreparing(true);
    setMessage('Preparing your file...');

    const nextPreviews: ParsedFilePreview[] = [];
    const nextSelections: SearchColumnSelections = {};
    const errors: string[] = [];

    for (const file of Array.from(fileList)) {
      try {
        const sheets = await parseSpreadsheetFile(file);
        for (const sheet of sheets) {
          nextPreviews.push(sheet);
          nextSelections[sheet.id] = sheet.columns;
        }
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Could not read this file.'}`);
      }
    }

    setParsedPreviews((current) => [...current, ...nextPreviews]);
    setSelectedColumns((current) => ({ ...current, ...nextSelections }));

    if (errors.length > 0) {
      setMessage(errors.join(' '));
    } else {
      const tabCount = nextPreviews.length;
      const fileCount = new Set(nextPreviews.map((p) => p.fileName)).size;
      setMessage(
        tabCount === fileCount
          ? `${fileCount} file(s) ready to import.`
          : `${fileCount} file(s) with ${tabCount} tab(s) ready to import.`,
      );
    }

    setIsPreparing(false);
  };

  const toggleColumn = (previewId: string, column: string) => {
    setSelectedColumns((current) => {
      const existing = current[previewId] ?? [];
      const next = existing.includes(column)
        ? existing.filter((item) => item !== column)
        : [...existing, column];
      return { ...current, [previewId]: next };
    });
  };

  const removePreparedPreview = (previewId: string) => {
    setParsedPreviews((current) => current.filter((p) => p.id !== previewId));
    setSelectedColumns((current) => {
      const copy = { ...current };
      delete copy[previewId];
      return copy;
    });
  };

  const removeFile = (fileName: string) => {
    setParsedPreviews((current) => current.filter((p) => p.fileName !== fileName));
    setSelectedColumns((current) => {
      const copy = { ...current };
      for (const [key] of Object.entries(copy)) {
        const preview = parsedPreviews.find((p) => p.id === key);
        if (preview?.fileName === fileName) delete copy[key];
      }
      return copy;
    });
  };

  const saveImportedFiles = async () => {
    if (parsedPreviews.length === 0) {
      setMessage('Please choose at least one file first.');
      return;
    }

    const previewsWithoutColumns = parsedPreviews.filter((p) => (selectedColumns[p.id] ?? []).length === 0);
    if (previewsWithoutColumns.length > 0) {
      setMessage('Please choose at least one search column for every tab.');
      return;
    }

    setIsPreparing(true);
    setMessage('Saving imported files...');

    for (const preview of parsedPreviews) {
      const dataset: Dataset = {
        id: preview.id,
        fileName: preview.fileName,
        sheetName: preview.sheetName,
        displayName: preview.displayName,
        sourceType: preview.sourceType,
        fileType: preview.fileType,
        importedAt: new Date().toISOString(),
        columns: preview.columns,
        searchableColumns: selectedColumns[preview.id] ?? preview.columns,
        rows: preview.rows,
        rowCount: preview.rowCount,
      };
      await saveDataset(dataset);
    }

    await onImported();
    setIsPreparing(false);
    setMessage('Files imported successfully.');
    onNavigate('search');
  };

  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Add Files</p>
          <h1>Add spreadsheet files</h1>
          <p>Choose files, check the preview, then choose the columns you want to search. Each Excel tab is imported separately.</p>
        </div>
        <button className="button" type="button" onClick={() => onNavigate('home')}>Back Home</button>
      </div>

      <label className="file-drop">
        <input
          accept=".csv,.tsv,.xlsx,.xls"
          multiple
          onChange={(event) => handleFiles(event.target.files)}
          type="file"
        />
        <span>Add CSV, TSV, XLS, or XLSX files</span>
        <small>Files stay on this computer.</small>
      </label>

      {message && <div className="status-message">{message}</div>}
      {isPreparing && <div className="progress-bar" aria-label="Preparing files" />}

      {parsedPreviews.length > 0 ? (
        <div className="import-summary">
          <strong>{fileGroups.size}</strong> file(s) ·{' '}
          <strong>{parsedPreviews.length}</strong> tab(s) ·{' '}
          <strong>{totalRows.toLocaleString()}</strong> total rows
        </div>
      ) : (
        <div className="empty-state">No files selected yet.</div>
      )}

      <div className="file-preview-stack">
        {Array.from(fileGroups.entries()).map(([fileName, sheets]) => (
          <div className="file-group" key={fileName}>
            {/* File group header — only shown for multi-tab Excel files */}
            {sheets.length > 1 && (
              <div className="file-group-header">
                <strong>{fileName}</strong>
                <span>{sheets.length} tabs</span>
                <button
                  className="button button-danger button-small"
                  type="button"
                  onClick={() => removeFile(fileName)}
                >
                  Remove all tabs
                </button>
              </div>
            )}

            {sheets.map((preview) => (
              <article className="preview-card" key={preview.id}>
                <div className="preview-header">
                  <div>
                    <h2>{preview.displayName}</h2>
                    {preview.sheetName && <p className="tab-label">Tab: {preview.sheetName}</p>}
                    <p>{preview.rowCount.toLocaleString()} rows · {preview.columns.length} columns</p>
                  </div>
                  <button className="button button-danger" type="button" onClick={() => removePreparedPreview(preview.id)}>
                    Remove
                  </button>
                </div>

                {preview.warnings.map((warning) => (
                  <div className="warning" key={warning}>{warning}</div>
                ))}

                <h3>Choose search columns</h3>
                <div className="checkbox-grid">
                  {preview.columns.map((column) => (
                    <label className="checkbox-pill" key={column}>
                      <input
                        checked={(selectedColumns[preview.id] ?? []).includes(column)}
                        onChange={() => toggleColumn(preview.id, column)}
                        type="checkbox"
                      />
                      {column}
                    </label>
                  ))}
                </div>

                <h3>Preview</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>{preview.columns.map((column) => <th key={column}>{column}</th>)}</tr>
                    </thead>
                    <tbody>
                      {preview.previewRows.map((row, index) => (
                        <tr key={`${preview.id}-${index}`}>
                          {preview.columns.map((column) => <td key={column}>{row[column]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        ))}
      </div>

      <div className="sticky-action-bar">
        <button className="button button-primary" disabled={parsedPreviews.length === 0 || isPreparing} type="button" onClick={saveImportedFiles}>
          Import Selected Files
        </button>
      </div>
    </section>
  );
}
