import type { Problem } from '../module_bindings/types';

export type Language = 'python' | 'java' | 'cpp';

export const LANGUAGES: readonly Language[] = ['python', 'java', 'cpp'] as const;

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python',
  java:   'Java',
  cpp:    'C++',
};

export function getBoilerplate(p: Problem, lang: Language): string {
  switch (lang) {
    case 'python': return p.boilerplatePython ?? '';
    case 'java':   return p.boilerplateJava   ?? '';
    case 'cpp':    return p.boilerplateCpp    ?? '';
  }
}

const LANG_STORAGE_KEY = 'lcr.selectedLang';

export function loadSavedLang(): Language {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (v === 'python' || v === 'java' || v === 'cpp') return v;
  } catch {}
  return 'python';
}

export function saveLang(lang: Language): void {
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch {}
}
