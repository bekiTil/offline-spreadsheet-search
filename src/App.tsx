import { useCallback, useEffect, useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { ImportScreen } from './components/ImportScreen';
import { SearchScreen } from './components/SearchScreen';
import { ManageFilesScreen } from './components/ManageFilesScreen';
import { InstallGate } from './components/InstallGate';
import { isRunningAsInstalledApp } from './components/InstallButton';
import { getDatasets } from './services/storage';
import type { Dataset } from './types/dataset';

type Screen = 'home' | 'import' | 'search' | 'manage';

function useInstalledAppMode() {
  const [installedAppMode, setInstalledAppMode] = useState(() => isRunningAsInstalledApp());

  useEffect(() => {
    const update = () => setInstalledAppMode(isRunningAsInstalledApp());
    const mediaQuery = window.matchMedia('(display-mode: standalone)');

    update();
    mediaQuery.addEventListener('change', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);

    return () => {
      mediaQuery.removeEventListener('change', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return installedAppMode;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const installedAppMode = useInstalledAppMode();

  const loadDatasets = useCallback(async () => {
    setIsLoading(true);
    const savedDatasets = await getDatasets();
    setDatasets(savedDatasets);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const registerServiceWorker = () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {
        // The app still works online if service worker registration is blocked.
      });
    };

    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true });
    }
  }, []);

  const renderScreen = () => {
    if (isLoading) return <div className="empty-state large">Loading saved imported files...</div>;

    if (screen === 'import') return <ImportScreen onImported={loadDatasets} onNavigate={setScreen} />;
    if (screen === 'search') return <SearchScreen datasets={datasets} onNavigate={setScreen} />;
    if (screen === 'manage') return <ManageFilesScreen datasets={datasets} onChanged={loadDatasets} onNavigate={setScreen} />;
    return <HomeScreen importedFileCount={datasets.length} onNavigate={setScreen} />;
  };

  if (!installedAppMode) {
    return <InstallGate />;
  }

  return (
    <main className="app-shell">
      <nav className="top-nav">
        <button className="brand" type="button" onClick={() => setScreen('home')}>
          Spreadsheet Search
        </button>
        <div className="nav-actions">
          <button className={screen === 'import' ? 'nav-link active' : 'nav-link'} type="button" onClick={() => setScreen('import')}>Add Files</button>
          <button className={screen === 'search' ? 'nav-link active' : 'nav-link'} type="button" onClick={() => setScreen('search')}>Search</button>
          <button className={screen === 'manage' ? 'nav-link active' : 'nav-link'} type="button" onClick={() => setScreen('manage')}>Manage Files</button>
        </div>
      </nav>
      {renderScreen()}
    </main>
  );
}
