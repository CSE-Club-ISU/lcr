import { useState } from 'react';
import { useSpacetimeDB } from 'spacetimedb/react';
import CodeEditor from '../problem/CodeEditor';
import { type Language, loadSavedLang, saveLang } from '../../utils/languages';
import type { SandboxResponse } from '../../utils/executor-types';
import { useSettings } from '../../hooks/useSettings';

const EXECUTOR_URL = import.meta.env.VITE_EXECUTOR_URL ?? 'http://localhost:8000';
const EXECUTOR_SECRET = import.meta.env.VITE_EXECUTOR_SECRET ?? '';

const SANDBOX_DEFAULTS: Record<Language, string> = {
  python: 'print("Hello, World!")\n',
  java: [
    'public class Main {',
    '    public static void main(String[] args) {',
    '        System.out.println("Hello, World!");',
    '    }',
    '}',
  ].join('\n') + '\n',
  cpp: [
    '#include <iostream>',
    'using namespace std;',
    '',
    'int main() {',
    '    cout << "Hello, World!" << endl;',
    '    return 0;',
    '}',
  ].join('\n') + '\n',
};

export default function SandboxTab() {
  const ctx = useSpacetimeDB();
  const [settings] = useSettings();

  const [lang, setLangState] = useState<Language>(loadSavedLang);
  const [code, setCode] = useState<string>(() => SANDBOX_DEFAULTS[loadSavedLang()]);
  const [resetCount, setResetCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SandboxResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  function switchLang(newLang: Language) {
    saveLang(newLang);
    setLangState(newLang);
    setCode(SANDBOX_DEFAULTS[newLang]);
    setResetCount(c => c + 1);
    setResult(null);
    setFetchError(null);
  }

  async function runCode() {
    if (running) return;
    setResult(null);
    setFetchError(null);

    // Catch the most common Java mistake before paying a network round-trip.
    if (lang === 'java' && !/^\s*public\s+class\s+Main\b/.test(code)) {
      setFetchError('Java: your code must contain a public class named Main (found at the top level).');
      return;
    }

    setRunning(true);
    try {
      const res = await fetch(`${EXECUTOR_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(EXECUTOR_SECRET ? { 'X-Executor-Secret': EXECUTOR_SECRET } : {}),
        },
        body: JSON.stringify({
          mode: 'sandbox',
          lang,
          code,
          player_identity: ctx.identity?.toHexString() ?? '',
        }),
      });
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        setFetchError(`Too many requests — wait ${retryAfter ?? 'a few'} second(s) before running again.`);
        return;
      }
      if (res.status === 403) {
        setFetchError('Sandbox mode requires a GitHub-authenticated account.');
        return;
      }
      const data: SandboxResponse = await res.json();
      setResult(data);
    } catch (e) {
      setFetchError(String(e));
    } finally {
      setRunning(false);
    }
  }

  const hasOutput = result !== null || fetchError !== null;

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Editor */}
      <div className="flex-1 min-h-0 flex flex-col">
        <CodeEditor
          key={`sandbox-${lang}-${resetCount}`}
          initialCode={code}
          onChange={setCode}
          language={lang}
          onLanguageChange={switchLang}
          vimMode={settings.vimMode}
        />
      </div>

      {/* Output */}
      {hasOutput && (
        <div className="card px-4 py-3 text-sm shrink-0 max-h-48 overflow-y-auto">
          {fetchError && (
            <pre className="text-red text-xs whitespace-pre-wrap">{fetchError}</pre>
          )}
          {result && result.compile_error && (
            <pre className="text-red text-xs whitespace-pre-wrap">{result.compile_error}</pre>
          )}
          {result && result.runtime_error && (
            <pre className="text-red text-xs whitespace-pre-wrap">{result.runtime_error}</pre>
          )}
          {result && result.success && (
            <pre className="text-green text-xs whitespace-pre-wrap">
              {result.stdout || '(no output)'}
            </pre>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2.5 shrink-0">
        <button
          onClick={() => {
            setCode(SANDBOX_DEFAULTS[lang]);
            setResetCount(c => c + 1);
            setResult(null);
            setFetchError(null);
          }}
          className="py-[11px] px-5 rounded-[10px] border border-border bg-transparent text-text-muted font-bold text-sm cursor-pointer hover:text-text hover:bg-surface"
        >
          ↺ Reset
        </button>
        <button
          onClick={runCode}
          disabled={running}
          className="flex-1 py-[11px] rounded-[10px] border border-border bg-surface text-text font-bold text-sm cursor-pointer hover:bg-surface-alt disabled:opacity-50"
        >
          {running ? 'Running…' : '▷ Run'}
        </button>
      </div>

      <p className="text-[11px] text-text-faint shrink-0">
        stdin is not available — programs run to completion with no input.
        {lang === 'java' && <> Java class must be named <code className="font-mono">Main</code>.</>}
      </p>
    </div>
  );
}
