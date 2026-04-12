import { useState, useMemo, useEffect } from 'react';
import { tables } from '../../module_bindings';
import type { QuizQuestion } from '../../module_bindings/types';
import { useTypedTable } from '../../utils/useTypedTable';

const MAX_ANSWER_LEN = 200;

const TYPE_LABEL: Record<string, string> = {
  mcq:       'Multiple Choice',
  tf:        'True / False',
  code_fill: 'Code Fill-In',
};

const TYPE_FILTER_OPTIONS = [
  { value: 'all',       label: 'All types' },
  { value: 'mcq',       label: 'Multiple Choice' },
  { value: 'tf',        label: 'True / False' },
  { value: 'code_fill', label: 'Code Fill-In' },
];

export default function QuizModeTab() {
  const [questions, isReady] = useTypedTable<QuizQuestion>(tables.quiz_question);

  const sorted = useMemo(
    () => [...questions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    [questions],
  );

  // Sidebar filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter(question => {
      if (typeFilter !== 'all' && question.questionType !== typeFilter) return false;
      if (q && !question.prompt.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sorted, search, typeFilter]);

  // Selected question (by id so it survives filter changes)
  const [selectedId, setSelectedId] = useState<bigint | null>(null);

  // Auto-select first filtered result when filter changes or on load
  useEffect(() => {
    if (filtered.length === 0) { setSelectedId(null); return; }
    if (selectedId !== null && filtered.some(q => q.id === selectedId)) return;
    setSelectedId(filtered[0].id);
  }, [filtered]);

  const q = useMemo(() => sorted.find(q => q.id === selectedId) ?? null, [sorted, selectedId]);

  // Answer state — reset when question changes
  const [selected, setSelected] = useState('');
  const [typed, setTyped] = useState('');
  const [answered, setAnswered] = useState(false);
  const [submittedAnswer, setSubmitted] = useState('');

  useEffect(() => {
    setSelected('');
    setTyped('');
    setAnswered(false);
    setSubmitted('');
  }, [selectedId]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        Loading questions…
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        No quiz questions available. An admin needs to run seed_quiz_questions.
      </div>
    );
  }

  function submit(raw: string) {
    const trimmed = raw.slice(0, MAX_ANSWER_LEN);
    if (!trimmed || answered) return;
    setSubmitted(trimmed);
    setAnswered(true);
  }

  const isCorrect = answered && q !== null &&
    q.answer.trim().toLowerCase() === submittedAnswer.trim().toLowerCase();

  const opts: string[] = q === null ? [] :
    q.questionType === 'mcq'
      ? (() => { try { return JSON.parse(q.options) as string[]; } catch { return []; } })()
      : q.questionType === 'tf'
        ? ['true', 'false']
        : [];

  return (
    <div className="flex h-full gap-0 min-h-0">

      {/* ── Sidebar ── */}
      <div className="flex flex-col w-56 shrink-0 border-r border-border pr-4 mr-4 min-h-0">
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search questions…"
          className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-[13px] text-text placeholder:text-text-faint outline-none focus:border-border-strong mb-2 shrink-0"
        />
        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-[13px] text-text outline-none focus:border-border-strong mb-3 shrink-0 cursor-pointer"
        >
          {TYPE_FILTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Question list */}
        <div className="overflow-y-auto flex-1 flex flex-col gap-0.5">
          {filtered.length === 0 ? (
            <div className="text-[12px] text-text-faint px-1 py-2">No matches.</div>
          ) : filtered.map(question => (
            <button
              key={String(question.id)}
              onClick={() => setSelectedId(question.id)}
              className={[
                'text-left px-2 py-2 rounded-lg text-[12px] leading-snug transition-colors cursor-pointer w-full',
                question.id === selectedId
                  ? 'bg-accent-soft text-accent font-semibold'
                  : 'text-text-muted hover:bg-surface hover:text-text',
              ].join(' ')}
            >
              <div className="truncate">{question.prompt}</div>
              <div className="text-[10px] text-text-faint mt-0.5">{TYPE_LABEL[question.questionType] ?? question.questionType}</div>
            </button>
          ))}
        </div>

        <div className="text-[11px] text-text-faint mt-2 shrink-0">{filtered.length} / {sorted.length} questions</div>
      </div>

      {/* ── Question panel ── */}
      {q === null ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Select a question.
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Type badge */}
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-4 shrink-0">
            {TYPE_LABEL[q.questionType] ?? q.questionType}
          </div>

          {/* Prompt */}
          <div className="text-sm text-text leading-[1.7] mb-5 shrink-0 font-mono whitespace-pre-wrap">
            {q.prompt}
          </div>

          {/* Answer area */}
          {opts.length > 0 ? (
            <div className="flex flex-col gap-2 mb-5 shrink-0">
              {opts.map(opt => {
                const wasSelected = answered && submittedAnswer === opt;
                const isRight = opt.trim().toLowerCase() === q.answer.trim().toLowerCase();
                let cls = 'px-4 py-2.5 rounded-lg text-left text-sm font-medium border transition-colors ';
                if (!answered) {
                  cls += selected === opt
                    ? 'bg-accent-soft border-accent text-text cursor-pointer'
                    : 'bg-surface border-border text-text hover:bg-surface-alt cursor-pointer';
                } else {
                  if (isRight) cls += 'bg-green/10 border-green/40 text-green cursor-default';
                  else if (wasSelected) cls += 'bg-red/10 border-red/40 text-red cursor-default';
                  else cls += 'bg-surface border-border text-text-faint cursor-default opacity-60';
                }
                return (
                  <button key={opt} disabled={answered} onClick={() => { setSelected(opt); submit(opt); }} className={cls}>
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); submit(typed); }} className="flex gap-2 mb-5 shrink-0">
              <input
                value={typed}
                onChange={e => setTyped(e.target.value.slice(0, MAX_ANSWER_LEN))}
                disabled={answered}
                maxLength={MAX_ANSWER_LEN}
                placeholder="Type your answer…"
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-border-strong disabled:opacity-50 font-mono"
              />
              <button
                type="submit"
                disabled={answered || !typed.trim()}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </form>
          )}

          {/* Feedback */}
          {answered && (
            <div className={`rounded-xl border p-4 mb-5 shrink-0 text-sm ${isCorrect ? 'bg-green/8 border-green/30' : 'bg-red/8 border-red/30'}`}>
              <div className={`font-bold mb-1 ${isCorrect ? 'text-green' : 'text-red'}`}>
                {isCorrect ? 'Correct!' : `Incorrect — the answer is "${q.answer}"`}
              </div>
              {q.explanation && (
                <div className="text-text-muted leading-[1.6]">{q.explanation}</div>
              )}
            </div>
          )}

          {/* Try Again */}
          {answered && !isCorrect && (
            <button
              onClick={() => { setAnswered(false); setSelected(''); setTyped(''); setSubmitted(''); }}
              className="self-start px-4 py-2 rounded-lg border border-border bg-surface text-text text-sm font-medium cursor-pointer hover:bg-surface-alt shrink-0"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
