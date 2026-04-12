import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { indentUnit } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { vim } from '@replit/codemirror-vim';
import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '../../utils/languages';

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
    ...(vimMode ? [vim()] : []),
  ];

  return (
    <div className={`flex-1 flex flex-col gap-3 min-h-0 ${containerClassName ?? ''}`} style={extraStyle}>
      <div className="flex-1 bg-surface-alt border border-border rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="flex justify-between px-5 py-3 items-center border-b border-border shrink-0">
          <select
            value={language}
            onChange={e => onLanguageChange(e.target.value as Language)}
            className="text-[12px] font-semibold bg-surface border border-border rounded-lg px-2 py-1 text-text cursor-pointer focus:outline-none focus:border-accent"
          >
            {LANGUAGES.map(l => (
              <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
            ))}
          </select>
          {vimMode && <span className="text-[11px] text-text-faint font-mono">-- VIM --</span>}
        </div>
        <div className="flex-1 overflow-auto">
          <CodeMirror
            ref={cmRef}
            value={initialCode}
            extensions={extensions}
            theme={oneDark}
            onChange={onChange}
            editable={!readOnly}
            style={{ height: '100%', fontSize: '13px' }}
            basicSetup={{ lineNumbers: true, bracketMatching: true, autocompletion: true }}
          />
        </div>
      </div>
    </div>
  );
});

export default CodeEditor;
