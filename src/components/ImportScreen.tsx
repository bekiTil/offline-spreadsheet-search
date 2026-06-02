import { useMemo, useState } from 'react';
import type { Dataset, ParsedFilePreview } from '../types/dataset';
import { parseSpreadsheetFile } from '../services/fileParser';
import { saveDataset } from '../services/storage';

type ImportScreenProps = {
  onImported: () => Promise<void>;
  onNavigate: (screen: 'home' | 'import' | 'search' | 'manage') => void;
};

type SearchColumnSelections = Record<string, string[]>;

export function ImportScreen({ onImported, onNavigate }: ImportScreenProps) {
  const [parsedFiles, setParsedFiles] = useState<ParsedFilePreview[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<SearchColumnSelections>({});
  const [isPreparing, setIsPreparing] = useState(false);
  const [message, setMessage] = useState<string>('');

  const totalRows = useMemo(() => parsedFiles.reduce((sum, file) => sum + file.rowCount, 0), [parsedFiles]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsPreparing(true);
    setMessage('Preparing your file...');

    const nextParsedFiles: ParsedFilePreview[] = [];
    const nextSelections: SearchColumnSelections = {};
    const errors: string[] = [];

    for (const file of Array.from(fileList)) {
      try {
        const parsed = await parseSpreadsheetFile(file);
        nextParsedFiles.push(parsed);
        nextSelections[parsed.id] = parsed.columns;
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Could not read this file.'}`);
      }
    }

    setParsedFiles((current) => [...current, ...nextParsedFiles]);
    setSelectedColumns((current) => ({ ...current, ...nextSelections }));
    setMessage(errors.length > 0 ? errors.join(' ') : `${nextParsedFiles.length} file(s) ready to import.`);
    setIsPreparing(false);
  };

  const toggleColumn = (fileId: string, column: string) => {
    setSelectedColumns((current) => {
      const existing = current[fileId] ?? [];
      const next = existing.includes(column)
        ? existing.filter((item) => item !== column)
        : [...existing, column];
      return { ...current, [fileId]: next };
    });
  };

  const saveImportedFiles = async () => {
    if (parsedFiles.length === 0) {
      setMessage('Please choose at least one file first.');
      return;
    }

    const filesWithoutColumns = parsedFiles.filter((file) => (selectedColumns[file.id] ?? []).length === 0);
    if (filesWithoutColumns.length > 0) {
      setMessage('Please choose at least one search column for every file.');
      return;
    }

    setIsPreparing(true);
    setMessage('Saving imported files...');

    for (const parsedFile of parsedFiles) {
      const dataset: Dataset = {
        id: parsedFile.id,
        fileName: parsedFile.fileName,
        fileType: parsedFile.fileType,
        importedAt: new Date().toISOString(),
        columns: parsedFile.columns,
        searchableColumns: selectedColumns[parsedFile.id] ?? parsedFile.columns,
        rows: parsedFile.rows,
        rowCount: parsedFile.rowCount,
      };
      await saveDataset(dataset);
    }

    await onImported();
    setIsPreparing(false);
    setMessage('Files imported successfully.');
    onNavigate('search');
  };

  const removePreparedFile = (fileId: string) => {
    setParsedFiles((current) => current.filter((file) => file.id !== fileId));
    setSelectedColumns((current) => {
      const copy = { ...current };
      delete copy[fileId];
      return copy;
    });
  };

  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Add Files</p>
          <h1>Add spreadsheet files</h1>
          <p>Choose files, check the preview, then choose the columns you want to search.</p>
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

      {parsedFiles.length > 0 ? (
        <div className="import-summary">
          <strong>{parsedFiles.length}</strong> file(s) ready · <strong>{totalRows}</strong> total rows
        </div>
      ) : (
        <div className="empty-state">No files selected yet.</div>
      )}

      <div className="file-preview-stack">
        {parsedFiles.map((file) => (
          <article className="preview-card" key={file.id}>
            <div className="preview-header">
              <div>
                <h2>{file.fileName}</h2>
                <p>{file.rowCount} rows · {file.columns.length} columns</p>
              </div>
              <button className="button button-danger" type="button" onClick={() => removePreparedFile(file.id)}>
                Remove
              </button>
            </div>

            {file.warnings.map((warning) => (
              <div className="warning" key={warning}>{warning}</div>
            ))}

            <h3>Choose search columns</h3>
            <div className="checkbox-grid">
              {file.columns.map((column) => (
                <label className="checkbox-pill" key={column}>
                  <input
                    checked={(selectedColumns[file.id] ?? []).includes(column)}
                    onChange={() => toggleColumn(file.id, column)}
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
                  <tr>{file.columns.map((column) => <th key={column}>{column}</th>)}</tr>
                </thead>
                <tbody>
                  {file.previewRows.map((row, index) => (
                    <tr key={`${file.id}-${index}`}>
                      {file.columns.map((column) => <td key={column}>{row[column]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </div>

      <div className="sticky-action-bar">
        <button className="button button-primary" disabled={parsedFiles.length === 0 || isPreparing} type="button" onClick={saveImportedFiles}>
          Import Selected Files
        </button>
      </div>
    </section>
  );
}
