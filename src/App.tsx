import { useCallback, useEffect, useMemo, useState } from 'react';
import { InstallGate } from './components/InstallGate';
import { isRunningAsInstalledApp } from './components/InstallButton';
import { ImportPanel } from './components/ImportPanel';
import { WorkPanel } from './components/WorkPanel';
import { ChevronRight, FileText, Table } from './components/Icons';
import { getDatasets, deleteDataset } from './services/storage';
import type { Dataset } from './types/dataset';

function useInstalledAppMode() {
  const [mode, setMode] = useState(() => isRunningAsInstalledApp());
  useEffect(() => {
    const update = () => setMode(isRunningAsInstalledApp());
    const mq = window.matchMedia('(display-mode: standalone)');
    update();
    mq.addEventListener('change', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return mode;
}

type MainView = 'import' | 'work';

/** Group datasets by fileName, preserving import order of first entry per file. */
function groupByFile(datasets: Dataset[]): Map<string, Dataset[]> {
  const map = new Map<string, Dataset[]>();
  for (const ds of datasets) {
    const arr = map.get(ds.fileName) ?? [];
    arr.push(ds);
    map.set(ds.fileName, arr);
  }
  return map;
}

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mainView, setMainView] = useState<MainView>('import');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Track which file groups are expanded in the sidebar
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const installedAppMode = useInstalledAppMode();

  const fileGroups = useMemo(() => groupByFile(datasets), [datasets]);

  const loadDatasets = useCallback(async (): Promise<Dataset[]> => {
    setIsLoading(true);
    try {
      const saved = await getDatasets();
      setDatasets(saved);
      return saved;
    } catch (err) {
      console.error('Failed to load imported files:', err);
      setDatasets([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadDatasets(); }, [loadDatasets]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const register = () =>
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  const handleImported = async (newIds: string[]) => {
    const fresh = await loadDatasets(); // fresh data, not stale state
    if (newIds.length > 0) {
      setSelectedId(newIds[0]!);
      setMainView('work');
      // Auto-expand every file group that was just imported
      const importedFileNames = new Set(
        fresh.filter(d => newIds.includes(d.id)).map(d => d.fileName),
      );
      setExpandedFiles(prev => new Set([...prev, ...importedFileNames]));
    }
  };

  const handleSelectDataset = (id: string) => {
    setSelectedId(id);
    setMainView('work');
  };

  const handleToggleFile = (fileName: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileName)) next.delete(fileName);
      else next.add(fileName);
      return next;
    });
  };

  const handleAddFiles = () => {
    setMainView('import');
    setSelectedId(null);
  };

  const handleRemove = async (id: string, displayName: string) => {
    const confirmed = window.confirm(
      `Remove "${displayName}"? This only removes it from this app — the file on your computer stays.`,
    );
    if (!confirmed) return;
    await deleteDataset(id);
    if (selectedId === id) {
      setSelectedId(null);
      setMainView('import');
    }
    await loadDatasets();
  };

  const handleRemoveFile = async (fileName: string, sheets: Dataset[]) => {
    const confirmed = window.confirm(
      `Remove all tabs from "${fileName}"? This only removes them from this app.`,
    );
    if (!confirmed) return;
    for (const ds of sheets) await deleteDataset(ds.id);
    if (sheets.some(ds => ds.id === selectedId)) {
      setSelectedId(null);
      setMainView('import');
    }
    await loadDatasets();
  };

  const selectedDataset = datasets.find(d => d.id === selectedId) ?? null;

  if (!installedAppMode) return <InstallGate />;

  const renderMain = () => {
    if (isLoading) {
      return (
        <div className="panel-empty">
          <div className="panel-loading-spinner" />
          <p>Loading saved files…</p>
        </div>
      );
    }
    if (mainView === 'work' && selectedDataset) {
      return <WorkPanel key={selectedDataset.id} dataset={selectedDataset} />;
    }
    return <ImportPanel onImported={handleImported} />;
  };

  return (
    <div className="app-shell">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="app-header">
        <span className="app-brand">Spreadsheet Search</span>
        <span className="app-privacy">Your files stay on this computer.</span>
      </header>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="app-body">

        {/* Left sidebar */}
        <aside className="sidebar">
          <div className="sidebar-heading">Imported Files</div>

          <div className="sidebar-list">
            {!isLoading && datasets.length === 0 && (
              <p className="sidebar-empty">No files imported yet.</p>
            )}

            {Array.from(fileGroups.entries()).map(([fileName, sheets]) => {
              const isMultiTab = sheets.length > 1;
              const isExpanded = expandedFiles.has(fileName);
              const isFileActive = sheets.some(ds => ds.id === selectedId) && mainView === 'work';

              if (!isMultiTab) {
                // Single sheet (CSV / TSV / single-tab Excel) — plain item
                const ds = sheets[0]!;
                const isActive = selectedId === ds.id && mainView === 'work';
                return (
                  <div
                    key={ds.id}
                    className={`sidebar-item${isActive ? ' active' : ''}`}
                    onClick={() => handleSelectDataset(ds.id)}
                    title={ds.displayName}
                  >
                    <FileText size={14} className="sidebar-file-icon" />
                    <div className="sidebar-item-body">
                      <span className="sidebar-item-name">{ds.fileName}</span>
                      <span className="sidebar-item-meta">{ds.rowCount.toLocaleString()} rows</span>
                    </div>
                    <button
                      className="sidebar-remove"
                      title="Remove"
                      onClick={e => { e.stopPropagation(); handleRemove(ds.id, ds.displayName); }}
                    >
                      ×
                    </button>
                  </div>
                );
              }

              // Multi-tab Excel — accordion group
              return (
                <div key={fileName} className="sidebar-group">
                  {/* File header row — toggles expand */}
                  <div
                    className={`sidebar-group-header${isFileActive ? ' file-active' : ''}`}
                    onClick={() => handleToggleFile(fileName)}
                    title={fileName}
                  >
                    <ChevronRight size={12} className={`sidebar-chevron${isExpanded ? ' open' : ''}`} />
                    <Table size={14} className="sidebar-file-icon" />
                    <div className="sidebar-item-body">
                      <span className="sidebar-item-name">{fileName}</span>
                      <span className="sidebar-item-meta">{sheets.length} tabs</span>
                    </div>
                    <button
                      className="sidebar-remove"
                      title="Remove all tabs"
                      onClick={e => { e.stopPropagation(); handleRemoveFile(fileName, sheets); }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Tab list — shown when expanded */}
                  {isExpanded && (
                    <div className="sidebar-tab-list">
                      {sheets.map(ds => {
                        const isActive = selectedId === ds.id && mainView === 'work';
                        return (
                          <div
                            key={ds.id}
                            className={`sidebar-tab-item${isActive ? ' active' : ''}`}
                            onClick={() => handleSelectDataset(ds.id)}
                            title={ds.sheetName}
                          >
                            <span className="sidebar-tab-indent" aria-hidden="true" />
                            <div className="sidebar-item-body">
                              <span className="sidebar-item-name">{ds.sheetName}</span>
                              <span className="sidebar-item-meta">{ds.rowCount.toLocaleString()} rows</span>
                            </div>
                            <button
                              className="sidebar-remove"
                              title="Remove this tab"
                              onClick={e => { e.stopPropagation(); handleRemove(ds.id, ds.displayName); }}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sidebar-footer">
            <button className="btn btn-primary sidebar-add" onClick={handleAddFiles}>
              + Add Files
            </button>
          </div>
        </aside>

        {/* Main panel */}
        <main className="main-panel">
          {renderMain()}
        </main>
      </div>
    </div>
  );
}
