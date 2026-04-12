import { createContext, useContext, useState } from 'react';
import { safeParseJson } from '../utils/parseJson';

const STORAGE_KEY = 'lcr_settings';

export interface Settings {
  vimMode: boolean;
}

const defaults: Settings = { vimMode: false };

function load(): Settings {
  return { ...defaults, ...safeParseJson<Partial<Settings>>(localStorage.getItem(STORAGE_KEY), {}, 'settings') };
}

type UpdateFn = (patch: Partial<Settings>) => void;

export const SettingsContext = createContext<[Settings, UpdateFn]>([defaults, () => {}]);

export function useSettingsState(): [Settings, UpdateFn] {
  const [settings, setSettings] = useState<Settings>(load);

  const update: UpdateFn = (patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return [settings, update];
}

export function useSettings() {
  return useContext(SettingsContext);
}
