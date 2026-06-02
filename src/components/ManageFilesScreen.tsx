import type { Dataset } from '../types/dataset';
import { deleteDataset } from '../services/storage';

type ManageFilesScreenProps = {
  datasets: Dataset[];
  onChanged: () => Promise<void>;
  onNavigate: (screen: 'home' | 'import' | 'search' | 'manage') => void;
};

export function ManageFilesScreen({ datasets, onChanged, onNavigate }: ManageFilesScreenProps) {
  const removeFile = async (dataset: Dataset) => {
    const confirmed = window.confirm(`Remove ${dataset.fileName}? This only removes it from this app.`);
    if (!confirmed) return;
    await deleteDataset(dataset.id);
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
          {datasets.map((dataset) => (
            <article className="file-card" key={dataset.id}>
              <div>
                <h2>{dataset.fileName}</h2>
                <p>{dataset.rowCount} rows · imported {new Date(dataset.importedAt).toLocaleString()}</p>
                <div className="tag-list">
                  {dataset.searchableColumns.map((column) => <span className="tag" key={column}>{column}</span>)}
                </div>
              </div>
              <div className="file-card-actions">
                <button className="button" type="button" onClick={() => onNavigate('import')}>Re-import</button>
                <button className="button button-danger" type="button" onClick={() => removeFile(dataset)}>Remove</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
