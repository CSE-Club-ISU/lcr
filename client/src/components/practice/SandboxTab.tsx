import { useState } from 'react';
import { useSpacetimeDB } from 'spacetimedb/react';
import CodeEditor from '../problem/CodeEditor';
import { type Language, loadSavedLang, saveLang } from '../../utils/languages';
import type { SandboxResponse } from '../../utils/executor-types';
import StatusBox from '../problem/StatusBox';
import { useStatusHistory } from '../problem/useStatusHistory';
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
  const status = useStatusHistory();

  function switchLang(newLang: Language) {
    saveLang(newLang);
    setLangState(newLang);
    setCode(SANDBOX_DEFAULTS[newLang]);
    setResetCount(c => c + 1);
  }

  async function runCode() {
    if (running) return;

    // Catch the most common Java mistake before paying a network round-trip.
    if (lang === 'java' && !/^\s*public\s+class\s+Main\b/.test(code)) {
      status.push({ kind: 'error', text: 'Java: your code must contain a public class named Main (found at the top level).' });
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
        status.push({ kind: 'error', text: `Too many requests — wait ${retryAfter ?? 'a few'} second(s) before running again.` });
        return;
      }

      const data: SandboxResponse = await res.json();
      if (data.compile_error) {
        status.push({ kind: 'error', text: data.compile_error });
      } else if (data.runtime_error) {
        status.push({ kind: 'error', text: data.runtime_error });
      } else {
        status.push({ kind: 'stdout', text: '', stdout: data.stdout ?? '' });
      }
    } catch (e) {
      status.push({ kind: 'error', text: String(e) });
    } finally {
      setRunning(false);
    }
  }

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
      <StatusBox entries={status.entries} />

      {/* Actions */}
      <div className="flex gap-2.5 shrink-0">
        <button
          onClick={() => {
            setCode(SANDBOX_DEFAULTS[lang]);
            setResetCount(c => c + 1);
            status.clear();
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
