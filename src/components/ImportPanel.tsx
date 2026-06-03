import { useRef, useState } from 'react';
import { parseSpreadsheetFile } from '../services/fileParser';
import { saveDataset } from '../services/storage';
import { Upload } from './Icons';
import type { Dataset } from '../types/dataset';

interface ImportPanelProps {
  onImported: (newIds: string[]) => void;
}

interface ImportedItem {
  displayName: string;
  rowCount: number;
  ok: boolean;
  error?: string;
}

export function ImportPanel({ onImported }: ImportPanelProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imported, setImported] = useState<ImportedItem[]>([]);
  const [busyLabel, setBusyLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    if (files.length === 0 || isBusy) return;
    setIsBusy(true);
    setImported([]);

    const newIds: string[] = [];
    const log: ImportedItem[] = [];

    for (const file of files) {
      setBusyLabel(`Reading ${file.name}…`);
      try {
        const previews = await parseSpreadsheetFile(file);
        for (const preview of previews) {
          setBusyLabel(`Saving ${preview.displayName}…`);
          // Auto-select recommended columns; fall back to all columns if none qualify
          const searchableColumns =
            preview.columnProfiles.filter(p => p.isRecommendedSearchable).map(p => p.columnName);
          const dataset: Dataset = {
            id: preview.id,
            fileName: preview.fileName,
            sheetName: preview.sheetName,
            displayName: preview.displayName,
            sourceType: preview.sourceType,
            fileType: preview.fileType,
            importedAt: new Date().toISOString(),
            columns: preview.columns,
            columnProfiles: preview.columnProfiles,
            searchableColumns:
              searchableColumns.length > 0 ? searchableColumns : preview.columns,
            rows: preview.rows,
            rowCount: preview.rowCount,
          };
          await saveDataset(dataset);
          newIds.push(preview.id);
          log.push({ displayName: preview.displayName, rowCount: preview.rowCount, ok: true });
        }
      } catch (e) {
        log.push({
          displayName: file.name,
          rowCount: 0,
          ok: false,
          error: e instanceof Error ? e.message : 'Could not read file.',
        });
      }
    }

    setImported(log);
    setBusyLabel('');
    setIsBusy(false);

    if (newIds.length > 0) onImported(newIds);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="import-panel">

      {/* Drop zone */}
      <div
        className={`drop-zone${isDragging ? ' dragging' : ''}${isBusy ? ' busy' : ''}`}
        onDragOver={e => { e.preventDefault(); if (!isBusy) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => { if (!isBusy) fileInputRef.current?.click(); }}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (!isBusy && (e.key === 'Enter' || e.key === ' ')) fileInputRef.current?.click(); }}
        aria-label="Add spreadsheet files"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        {isBusy ? (
          <>
            <div className="drop-spinner" />
            <p className="drop-title">Importing…</p>
            <p className="drop-hint">{busyLabel}</p>
          </>
        ) : (
          <>
            <Upload size={38} className="drop-icon-svg" />
            <p className="drop-title">Add Spreadsheet Files</p>
            <p className="drop-hint">Drag files here, or click to choose</p>
            <div className="drop-types">
              <span>CSV</span><span>TSV</span><span>XLS</span><span>XLSX</span>
            </div>
            <p className="drop-privacy">Your files stay on this computer — nothing is uploaded.</p>
          </>
        )}
      </div>

      {/* Result log */}
      {imported.length > 0 && (
        <div className="import-log">
          {imported.map((item, i) => (
            <div key={i} className={`import-log-item${item.ok ? '' : ' error'}`}>
              {item.ok ? (
                <>
                  <span className="import-log-check">✓</span>
                  <span className="import-log-name">{item.displayName}</span>
                  <span className="import-log-meta">{item.rowCount.toLocaleString()} rows imported</span>
                </>
              ) : (
                <>
                  <span className="import-log-error-icon">⚠</span>
                  <span className="import-log-name">{item.displayName}</span>
                  <span className="import-log-meta">{item.error}</span>
                </>
              )}
            </div>
          ))}
          <p className="import-log-hint">Select a file from the sidebar to start searching.</p>
        </div>
      )}
    </div>
  );
}
