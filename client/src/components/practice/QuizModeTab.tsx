import { useState, useMemo, useEffect } from 'react';
import { tables } from '../../module_bindings';
import type { QuizQuestion } from '../../module_bindings/types';
import { useTypedTable } from '../../utils/useTypedTable';

const MAX_ANSWER_LEN = 200;

export default function QuizModeTab() {
  const [questions, loading] = useTypedTable<QuizQuestion>(tables.quiz_question);

  const sorted = useMemo(
    () => [...questions].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    [questions],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string>('');
  const [typed, setTyped] = useState('');
  const [answered, setAnswered] = useState(false);
  const [submittedAnswer, setSubmitted] = useState('');

  useEffect(() => {
    setSelected('');
    setTyped('');
    setAnswered(false);
    setSubmitted('');
  }, [currentIndex]);

  if (loading) {
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

  const q = sorted[currentIndex];
  const total = sorted.length;

  const opts: string[] =
    q.questionType === 'mcq'
      ? (() => { try { return JSON.parse(q.options) as string[]; } catch { return []; } })()
      : q.questionType === 'tf'
        ? ['true', 'false']
        : [];

  function submit(raw: string) {
    const trimmed = raw.slice(0, MAX_ANSWER_LEN);
    if (!trimmed || answered) return;
    setSubmitted(trimmed);
    setAnswered(true);
  }

  const isCorrect =
    answered && q.answer.trim().toLowerCase() === submittedAnswer.trim().toLowerCase();

  const questionTypeLabel =
    q.questionType === 'mcq'      ? 'Multiple Choice' :
    q.questionType === 'tf'       ? 'True / False'    :
    /* code_fill */                 'Code Fill-In';

  return (
    <div className="flex flex-col h-full gap-0">

      {/* Header row */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          {questionTypeLabel}
        </span>
        <span className="text-[12px] text-text-muted font-mono">
          {currentIndex + 1} / {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-surface-alt rounded-full mb-5 shrink-0">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
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
            let cls =
              'px-4 py-2.5 rounded-lg text-left text-sm font-medium border transition-colors ';
            if (!answered) {
              cls +=
                selected === opt
                  ? 'bg-accent-soft border-accent text-text cursor-pointer'
                  : 'bg-surface border-border text-text hover:bg-surface-alt cursor-pointer';
            } else {
              if (isRight) {
                cls += 'bg-green/10 border-green/40 text-green cursor-default';
              } else if (wasSelected) {
                cls += 'bg-red/10 border-red/40 text-red cursor-default';
              } else {
                cls += 'bg-surface border-border text-text-faint cursor-default opacity-60';
              }
            }
            return (
              <button
                key={opt}
                disabled={answered}
                onClick={() => { setSelected(opt); submit(opt); }}
                className={cls}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <form
          onSubmit={e => { e.preventDefault(); submit(typed); }}
          className="flex gap-2 mb-5 shrink-0"
        >
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

      {/* Feedback + Explanation */}
      {answered && (
        <div
          className={`rounded-xl border p-4 mb-5 shrink-0 text-sm ${
            isCorrect ? 'bg-green/8 border-green/30' : 'bg-red/8 border-red/30'
          }`}
        >
          <div className={`font-bold mb-1 ${isCorrect ? 'text-green' : 'text-red'}`}>
            {isCorrect ? 'Correct!' : `Incorrect — the answer is "${q.answer}"`}
          </div>
          {q.explanation && (
            <div className="text-text-muted leading-[1.6]">{q.explanation}</div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-auto flex items-center justify-between gap-3 shrink-0 pt-2">
        <button
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2 rounded-lg border border-border bg-transparent text-text-muted text-sm font-medium cursor-pointer hover:text-text hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>

        {answered && !isCorrect && (
          <button
            onClick={() => {
              setAnswered(false);
              setSelected('');
              setTyped('');
              setSubmitted('');
            }}
            className="px-4 py-2 rounded-lg border border-border bg-surface text-text text-sm font-medium cursor-pointer hover:bg-surface-alt"
          >
            Try Again
          </button>
        )}

        <button
          onClick={() => setCurrentIndex(i => Math.min(total - 1, i + 1))}
          disabled={currentIndex === total - 1}
          className="px-4 py-2 rounded-lg border border-border bg-surface text-text text-sm font-medium cursor-pointer hover:bg-surface-alt disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
        >
          Next →
        </button>
      </div>

    </div>
  );
}
