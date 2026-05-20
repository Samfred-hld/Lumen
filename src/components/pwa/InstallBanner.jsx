import React from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

/**
 * InstallBanner - Custom PWA install prompt in Portuguese.
 * Shown at bottom of Layout (above mobile nav) when the app is installable.
 * User can click to install or dismiss for the session.
 */
export default function InstallBanner() {
  const { isInstallable, promptInstall, dismissInstall } = useInstallPrompt();

  if (!isInstallable) return null;

  const handleInstall = async () => {
    const result = await promptInstall();
    // promptInstall handles dismissal internally
  };

  return (
    <div
      className="flex items-center justify-between gap-3 bg-card border-t border-border px-4 py-3"
      role="dialog"
      aria-label="Instalar aplicativo"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="material-symbols-outlined text-primary shrink-0"
          style={{ fontSize: 24 }}
        >
          install_mobile
        </span>
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-foreground truncate">
            Instalar Lúmen
          </p>
          <p className="text-caption text-muted-foreground truncate">
            Acesse mais rápido pela tela inicial
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-primary text-primary-foreground text-body-sm font-semibold rounded-md hover:bg-primary/90 transition-colors h-11 min-w-[44px]"
        >
          Instalar
        </button>
        <button
          onClick={dismissInstall}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors h-11 w-11 flex items-center justify-center"
          aria-label="Fechar"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            close
          </span>
        </button>
      </div>
    </div>
  );
}
