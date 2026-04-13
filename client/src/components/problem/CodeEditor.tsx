import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { indentUnit } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { vim } from '@replit/codemirror-vim';
import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '../../utils/languages';
import { lcrEditorExtensions } from './editorTheme';

interface Props {
  initialCode: string;
  onChange: (code: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  vimMode?: boolean;
  readOnly?: boolean;
  containerClassName?: string;
  extraStyle?: React.CSSProperties;
}

export interface CodeEditorHandle {
  deleteRandomLine: () => void;
}

function langExtension(lang: Language) {
  switch (lang) {
    case 'python': return python();
    case 'java':   return java();
    case 'cpp':    return cpp();
  }
}

const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor(
  { initialCode, onChange, language, onLanguageChange, vimMode, readOnly, containerClassName, extraStyle },
  ref,
) {
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  useImperativeHandle(ref, () => ({
    deleteRandomLine: () => {
      const view = cmRef.current?.view;
      if (!view) return;
      const doc = view.state.doc;
      if (doc.lines <= 1) return;
      const lineNum = Math.floor(Math.random() * doc.lines) + 1;
      const line = doc.line(lineNum);
      view.dispatch({
        changes: { from: line.from, to: Math.min(line.to + 1, doc.length) },
      });
    },
  }), []);

  // Refresh ref when editor re-mounts
  useEffect(() => { /* keep ref stable */ }, [cmRef.current?.view]);

  const extensions = [
    langExtension(language),
    indentUnit.of('    '),
    EditorState.tabSize.of(4),
    ...lcrEditorExtensions,
    ...(vimMode ? [vim()] : []),
  ];

  return (
    <div className={`flex-1 flex flex-col gap-3 min-h-0 ${containerClassName ?? ''}`} style={extraStyle}>
      <div
        className="flex-1 bg-[var(--color-surface)] rounded-lg overflow-hidden flex flex-col min-h-0"
        style={{ border: '1px solid var(--color-hairline-strong)' }}
      >
        <div
          className="flex justify-between px-4 py-2.5 items-center shrink-0"
          style={{ borderBottom: '1px solid var(--color-hairline)' }}
        >
          <div className="flex items-center gap-3">
            <span className="label-eyebrow">Editor</span>
            <select
              value={language}
              onChange={e => onLanguageChange(e.target.value as Language)}
              className="text-[12px] mono-tabular bg-transparent border rounded-md px-2 py-1 text-text cursor-pointer focus:outline-none"
              style={{ borderColor: 'var(--color-hairline-strong)' }}
            >
              {LANGUAGES.map(l => (
                <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
              ))}
            </select>
          </div>
          {vimMode && (
            <span className="label-eyebrow text-gold-bright" style={{ letterSpacing: '0.24em' }}>
              — VIM —
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <CodeMirror
            ref={cmRef}
            value={initialCode}
            extensions={extensions}
            onChange={onChange}
            editable={!readOnly}
            height="100%"
            basicSetup={{ lineNumbers: true, bracketMatching: true, autocompletion: true }}
            style={{ fontSize: '13px' }}
          />
        </div>
      </div>
    </div>
  );
});

export default CodeEditor;
