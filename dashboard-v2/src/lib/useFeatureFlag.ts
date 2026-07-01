import { useState, useEffect } from 'react';
import { api } from './api';

const flagCache = new Map<string, boolean>();

export function useFeatureFlag(key: string): boolean {
  const [enabled, setEnabled] = useState(() => flagCache.get(key) ?? false);

  useEffect(() => {
    if (flagCache.has(key)) return;
    api('/feature-flags')
      .then((flags: { key: string; enabled: boolean }[]) => {
        for (const f of flags) flagCache.set(f.key, f.enabled);
        setEnabled(flagCache.get(key) ?? false);
      })
      .catch(() => {});
  }, [key]);

  return enabled;
}
