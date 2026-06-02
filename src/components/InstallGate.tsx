import { useEffect, useState } from 'react';
import { InstallButton } from './InstallButton';

export function InstallGate() {
  const [wasInstalled, setWasInstalled] = useState(false);

  useEffect(() => {
    const onInstalled = () => setWasInstalled(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  return (
    <section className="install-page">
      <div className="install-card simple-install-card">
        <p className="eyebrow">Spreadsheet Search</p>
        <h1>Install first.</h1>
        <p className="hero-text">
          To keep things simple, files can only be added from the installed app window.
        </p>

        <div className="install-actions simple-install-actions">
          <InstallButton
            label="Install Spreadsheet Search"
            unavailableLabel={wasInstalled ? 'Installed' : 'Install is getting ready. Refresh once if this button stays disabled.'}
            showWhenUnavailable
          />
        </div>

        <div className="simple-steps">
          <div className="simple-step">
            <span>1</span>
            <p><strong>Click Install Spreadsheet Search.</strong></p>
          </div>
          <div className="simple-step">
            <span>2</span>
            <p><strong>Click Install when asked.</strong></p>
          </div>
          <div className="simple-step">
            <span>3</span>
            <p><strong>Open Spreadsheet Search from your computer.</strong></p>
          </div>
        </div>

        {wasInstalled && (
          <div className="installed-next-box simple-next-box">
            <strong>Installed.</strong>
            <span>Now open Spreadsheet Search from your computer. You may also see an “Open in app” button near the address bar.</span>
          </div>
        )}

        <div className="privacy-box compact">
          Your spreadsheet files stay on this computer.
        </div>

        <p className="small-note">
          This page is only for installing the app. After installing, use the app window to add files and search.
        </p>
      </div>
    </section>
  );
}
