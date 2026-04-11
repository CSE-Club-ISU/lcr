import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import Pill from '../ui/Pill';

interface Props {
  initialCode: string;
  onChange: (code: string) => void;
}

export default function CodeEditor({ initialCode, onChange }: Props) {
  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      <div className="flex-1 bg-surface-alt border border-border rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="flex justify-between px-5 py-3 items-center border-b border-border shrink-0">
          <Pill label="Python" color="blue" />
        </div>
        <div className="flex-1 overflow-auto">
          <CodeMirror
            value={initialCode}
            extensions={[python()]}
            theme={oneDark}
            onChange={onChange}
            style={{ height: '100%', fontSize: '13px' }}
            basicSetup={{ lineNumbers: true, bracketMatching: true, autocompletion: true }}
          />
        </div>
      </div>
    </div>
  );
}
