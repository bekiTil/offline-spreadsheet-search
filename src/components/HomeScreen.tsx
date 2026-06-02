type HomeScreenProps = {
  onNavigate: (screen: 'home' | 'import' | 'search' | 'manage') => void;
  importedFileCount: number;
};

export function HomeScreen({ onNavigate, importedFileCount }: HomeScreenProps) {
  return (
    <section className="screen home-grid">
      <div className="hero-card">
        <p className="eyebrow">Spreadsheet Search</p>
        <h1>Search your spreadsheets.</h1>
        <p className="hero-text">
          Add your spreadsheet files, choose the columns you care about, and search them quickly.
        </p>
        <div className="privacy-box">
          Your spreadsheet files stay on this computer.
        </div>
        <div className="hero-actions">
          <button className="button button-primary" onClick={() => onNavigate('import')} type="button">
            Add Files
          </button>
          <button className="button" onClick={() => onNavigate('search')} type="button" disabled={importedFileCount === 0}>
            Search
          </button>
          <button className="button" onClick={() => onNavigate('manage')} type="button" disabled={importedFileCount === 0}>
            Manage Files
          </button>
        </div>
      </div>

      <div className="steps-card">
        <h2>How it works</h2>
        <ol className="steps-list">
          <li><strong>Add Files</strong><span>Choose one or more spreadsheet files.</span></li>
          <li><strong>Choose Columns</strong><span>Select the columns you want to search.</span></li>
          <li><strong>Search</strong><span>Find matching rows.</span></li>
        </ol>
        <p className="small-note">Imported files: {importedFileCount}</p>
      </div>
    </section>
  );
}
