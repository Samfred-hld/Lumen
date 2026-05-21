import { useState, useEffect, useCallback } from 'react';
import { getTheme, setTheme, applyThemeToDOM } from '@/lib/store';

export function useThemePreference() {
  const [preference, setPreference] = useState(() => getTheme());

  const applyTheme = useCallback((pref) => {
    applyThemeToDOM(pref);
    setTheme(pref);
  }, []);

  useEffect(() => {
    applyTheme(preference);

    if (preference === 'auto') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyThemeToDOM('auto');
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
  }, [preference, applyTheme]);

  return { preference, setPreference };
}
