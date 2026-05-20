import { useState, useEffect, useCallback } from 'react';

const DISMISSED_KEY = 'lumen_pwa_install_dismissed';

/**
 * Hook that manages the PWA install prompt lifecycle.
 * Captures the beforeinstallprompt event, provides promptInstall(),
 * and tracks installation state. Dismissal is per-session (sessionStorage).
 *
 * @returns {{
 *   isInstallable: boolean,
 *   isInstalled: boolean,
 *   promptInstall: () => Promise<{ outcome: string } | undefined>,
 *   dismissInstall: () => void
 * }}
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        sessionStorage.removeItem(DISMISSED_KEY);
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return undefined;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'dismissed') {
      try {
        sessionStorage.setItem(DISMISSED_KEY, 'true');
      } catch {}
      setIsDismissed(true);
    }

    setDeferredPrompt(null);
    return { outcome };
  }, [deferredPrompt]);

  const dismissInstall = useCallback(() => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch {}
    setIsDismissed(true);
  }, []);

  const isInstallable = !!deferredPrompt && !isInstalled && !isDismissed;

  return {
    isInstallable,
    isInstalled,
    promptInstall,
    dismissInstall,
  };
}
