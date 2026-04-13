import { useState, useMemo, useEffect } from 'react';
import { tables } from '../../module_bindings';
import type { QuizQuestion } from '../../module_bindings/types';
import { useTypedTable } from '../../utils/useTypedTable';
import { safeParseJson } from '../../utils/parseJson';

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
      ? safeParseJson<string[]>(q.options, [], 'quiz options')
      : q.questionType === 'tf'
        ? ['true', 'false']
        : [];

  return (
    <div className="flex h-full gap-0 min-h-0">

      {/* ── Sidebar ── */}
      <div className="flex flex-col w-60 shrink-0 pr-5 mr-5 min-h-0" style={{ borderRight: '1px solid var(--color-hairline)' }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full bg-transparent rounded-md px-3 py-1.5 text-[13px] text-text placeholder:text-text-faint outline-none mb-2 shrink-0"
          style={{ border: '1px solid var(--color-hairline-strong)' }}
        />
        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="w-full bg-transparent rounded-md px-2 py-1.5 text-[13px] text-text outline-none mb-4 shrink-0 cursor-pointer"
          style={{ border: '1px solid var(--color-hairline-strong)' }}
        >
          {TYPE_FILTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Question list */}
        <div className="overflow-y-auto flex-1 flex flex-col">
          {filtered.length === 0 ? (
            <div className="text-[12px] text-text-faint px-1 py-2">No matches.</div>
          ) : filtered.map(question => {
            const active = question.id === selectedId;
            return (
              <button
                key={String(question.id)}
                onClick={() => setSelectedId(question.id)}
                className="text-left px-3 py-2.5 text-[12.5px] leading-snug transition-colors cursor-pointer w-full"
                style={{
                  background: active ? 'rgba(245, 197, 24, 0.04)' : 'transparent',
                  borderLeft: active ? '1px solid var(--color-gold-bright)' : '1px solid transparent',
                  color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                }}
              >
                <div className="truncate" style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: active ? 'italic' : 'normal',
                }}>
                  {question.prompt}
                </div>
                <div className="label-eyebrow mt-1" style={{ fontSize: 9 }}>{TYPE_LABEL[question.questionType] ?? question.questionType}</div>
              </button>
            );
          })}
        </div>

        <div className="label-eyebrow mt-3 shrink-0">{filtered.length} / {sorted.length} questions</div>
      </div>

      {/* ── Question panel ── */}
      {q === null ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Select a question.
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Type eyebrow */}
          <div className="label-eyebrow mb-4 shrink-0">
            {TYPE_LABEL[q.questionType] ?? q.questionType}
          </div>

          {/* Prompt */}
          <div className="text-[14px] text-text leading-[1.7] mb-6 shrink-0 mono-tabular whitespace-pre-wrap">
            {q.prompt}
          </div>

          {/* Answer area */}
          {opts.length > 0 ? (
            <div className="flex flex-col gap-2 mb-5 shrink-0">
              {opts.map(opt => {
                const wasSelected = answered && submittedAnswer === opt;
                const isRight = opt.trim().toLowerCase() === q.answer.trim().toLowerCase();
                let bg = 'transparent';
                let border = 'var(--color-hairline-strong)';
                let color = 'var(--color-text)';
                if (!answered) {
                  if (selected === opt) {
                    bg = 'rgba(192, 39, 45, 0.06)';
                    border = 'var(--color-hairline-cardinal)';
                  }
                } else {
                  if (isRight) { color = 'var(--color-green)'; border = 'rgba(34, 197, 94, 0.4)'; bg = 'rgba(34, 197, 94, 0.04)'; }
                  else if (wasSelected) { color = 'var(--color-accent)'; border = 'var(--color-hairline-cardinal)'; bg = 'rgba(192, 39, 45, 0.04)'; }
                  else { color = 'var(--color-text-faint)'; }
                }
                return (
                  <button
                    key={opt}
                    disabled={answered}
                    onClick={() => { setSelected(opt); submit(opt); }}
                    className="px-4 py-2.5 rounded-md text-left text-[13px] transition-colors"
                    style={{ background: bg, border: `1px solid ${border}`, color, cursor: answered ? 'default' : 'pointer' }}
                  >
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
                className="flex-1 bg-transparent rounded-md px-3 py-2 text-[13px] text-text placeholder:text-text-faint outline-none disabled:opacity-50 mono-tabular"
                style={{ border: '1px solid var(--color-hairline-strong)' }}
              />
              <button
                type="submit"
                disabled={answered || !typed.trim()}
                className="btn-editorial"
                style={{ opacity: answered || !typed.trim() ? 0.4 : 1 }}
              >
                Submit
              </button>
            </form>
          )}

          {/* Feedback */}
          {answered && (
            <div
              className="rounded-md p-4 mb-5 shrink-0 text-[13px]"
              style={{
                background: isCorrect ? 'rgba(34, 197, 94, 0.04)' : 'rgba(192, 39, 45, 0.04)',
                border: `1px solid ${isCorrect ? 'rgba(34, 197, 94, 0.3)' : 'var(--color-hairline-cardinal)'}`,
              }}
            >
              <div className="mb-1" style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 16,
                color: isCorrect ? 'var(--color-green)' : 'var(--color-accent)',
              }}>
                {isCorrect ? 'Correct.' : `Incorrect — the answer is "${q.answer}"`}
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
              className="btn-ghost self-start"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
