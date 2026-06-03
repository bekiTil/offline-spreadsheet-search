import { useMemo } from 'react';
import type { Dataset } from '../types/dataset';
import { deleteDataset } from '../services/storage';

type ManageFilesScreenProps = {
  datasets: Dataset[];
  onChanged: () => Promise<void>;
  onNavigate: (screen: 'home' | 'import' | 'search' | 'manage') => void;
};

function groupByFile(datasets: Dataset[]): Map<string, Dataset[]> {
  const map = new Map<string, Dataset[]>();
  for (const dataset of datasets) {
    const group = map.get(dataset.fileName) ?? [];
    group.push(dataset);
    map.set(dataset.fileName, group);
  }
  return map;
}

export function ManageFilesScreen({ datasets, onChanged, onNavigate }: ManageFilesScreenProps) {
  const fileGroups = useMemo(() => groupByFile(datasets), [datasets]);

  const removeTab = async (dataset: Dataset) => {
    const label = dataset.sheetName ? `the "${dataset.sheetName}" tab from ${dataset.fileName}` : dataset.fileName;
    const confirmed = window.confirm(`Remove ${label}? This only removes it from this app.`);
    if (!confirmed) return;
    await deleteDataset(dataset.id);
    await onChanged();
  };

  const removeAllTabs = async (fileName: string, sheets: Dataset[]) => {
    const confirmed = window.confirm(`Remove all tabs from "${fileName}"? This only removes them from this app.`);
    if (!confirmed) return;
    for (const dataset of sheets) {
      await deleteDataset(dataset.id);
    }
    await onChanged();
  };

  return (
    <section className="screen">
      <div className="screen-header">
        <div>
          <p className="eyebrow">Manage Files</p>
          <h1>Imported files</h1>
          <p>Review, remove, or re-import files saved on this computer.</p>
        </div>
        <div className="header-actions">
          <button className="button" type="button" onClick={() => onNavigate('home')}>Back Home</button>
          <button className="button button-primary" type="button" onClick={() => onNavigate('import')}>Re-import / Add Files</button>
        </div>
      </div>

      {datasets.length === 0 ? (
        <div className="empty-state large">
          <h2>No imported files yet</h2>
          <p>Add files to make them searchable.</p>
          <button className="button button-primary" type="button" onClick={() => onNavigate('import')}>Add Files</button>
        </div>
      ) : (
        <div className="file-list">
          {Array.from(fileGroups.entries()).map(([fileName, sheets]) => (
            <div className="file-group-manage" key={fileName}>
              {/* Multi-tab file: show file header then each tab */}
              {sheets.length > 1 ? (
                <>
                  <div className="file-group-manage-header">
                    <div>
                      <h2>{fileName}</h2>
                      <p>{sheets.length} tabs · {sheets.reduce((sum, s) => sum + s.rowCount, 0).toLocaleString()} total rows · imported {new Date(sheets[0]!.importedAt).toLocaleString()}</p>
                    </div>
                    <div className="file-card-actions">
                      <button className="button" type="button" onClick={() => onNavigate('import')}>Re-import</button>
                      <button className="button button-danger" type="button" onClick={() => removeAllTabs(fileName, sheets)}>Remove All</button>
                    </div>
                  </div>
                  {sheets.map((dataset) => (
                    <article className="file-card file-card-tab" key={dataset.id}>
                      <div>
                        <h3>Tab: {dataset.sheetName}</h3>
                        <p>{dataset.rowCount.toLocaleString()} rows</p>
                        <div className="tag-list">
                          {dataset.searchableColumns.map((column) => <span className="tag" key={column}>{column}</span>)}
                        </div>
                      </div>
                      <div className="file-card-actions">
                        <button className="button button-danger button-small" type="button" onClick={() => removeTab(dataset)}>Remove tab</button>
                      </div>
                    </article>
                  ))}
                </>
              ) : (
                // Single sheet (CSV/TSV or single-tab Excel): flat card
                <article className="file-card" key={sheets[0]!.id}>
                  <div>
                    <h2>{sheets[0]!.displayName}</h2>
                    <p>{sheets[0]!.rowCount.toLocaleString()} rows · imported {new Date(sheets[0]!.importedAt).toLocaleString()}</p>
                    <div className="tag-list">
                      {sheets[0]!.searchableColumns.map((column) => <span className="tag" key={column}>{column}</span>)}
                    </div>
                  </div>
                  <div className="file-card-actions">
                    <button className="button" type="button" onClick={() => onNavigate('import')}>Re-import</button>
                    <button className="button button-danger" type="button" onClick={() => removeTab(sheets[0]!)}>Remove</button>
                  </div>
                </article>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
