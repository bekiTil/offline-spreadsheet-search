import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type InstallButtonProps = {
  label?: string;
  unavailableLabel?: string;
  className?: string;
  showWhenUnavailable?: boolean;
  onInstalled?: () => void;
};

export function isRunningAsInstalledApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallButton({
  label = 'Install Spreadsheet Search',
  unavailableLabel = 'Install option is loading...',
  className = 'button button-primary',
  showWhenUnavailable = false,
  onInstalled,
}: InstallButtonProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(isRunningAsInstalledApp());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      onInstalled?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [onInstalled]);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === 'accepted') onInstalled?.();
  };

  if (isInstalled) return null;

  if (!installPrompt) {
    if (!showWhenUnavailable) return null;
    return (
      <button className={className} type="button" disabled>
        {unavailableLabel}
      </button>
    );
  }

  return (
    <button className={className} onClick={installApp} type="button">
      {label}
    </button>
  );
}
