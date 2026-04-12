import { useMemo, useState, useEffect } from 'react';
import { useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../../module_bindings';
import type { QuizQuestion, GameState } from '../../module_bindings/types';
import { useTypedTable } from '../../utils/useTypedTable';

interface Props {
  game: GameState;
  isP1: boolean;
}

const COOLDOWN_SEC = 30;
const REWARD = 10;

export default function QuizPanel({ game, isP1 }: Props) {
  const [questions] = useTypedTable<QuizQuestion>(tables.quiz_question);
  const answerQuiz = useReducer(reducers.answerQuiz);

  const lastAtMicros = isP1 ? game.player1LastQuizAt.microsSinceUnixEpoch : game.player2LastQuizAt.microsSinceUnixEpoch;
  const startMicros  = game.startTime.microsSinceUnixEpoch;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // last_quiz_at is initialized to start_time; treat that as "no quiz answered yet".
  const neverAnswered = lastAtMicros === startMicros;
  const secsSinceLast = Math.floor((Date.now() - Number(lastAtMicros / 1000n)) / 1000);
  const cooldownRemaining = neverAnswered ? 0 : Math.max(0, COOLDOWN_SEC - secsSinceLast);

  // Pick a question: rotate deterministically by the count of quizzes answered
  // so the same question isn't repeated rapidly. Re-derive on each lastAt change.
  const [seed, setSeed] = useState(0);
  useEffect(() => { setSeed(s => s + 1); }, [lastAtMicros]);

  const question: QuizQuestion | undefined = useMemo(() => {
    if (questions.length === 0) return undefined;
    return questions[(seed + Number(lastAtMicros % BigInt(questions.length))) % questions.length];
  }, [questions, seed, lastAtMicros]);

  const [selected, setSelected] = useState<string>('');
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Reset UI when the active question changes
  useEffect(() => {
    setSelected('');
    setTyped('');
    setFeedback(null);
  }, [question?.id]);

  // Clear transient feedback after a moment
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 1500);
    return () => clearTimeout(t);
  }, [feedback]);

  if (questions.length === 0) {
    return <div className="text-xs text-text-muted">No quiz questions available.</div>;
  }
  if (!question) return null;

  async function submit(answer: string) {
    if (!answer || cooldownRemaining > 0 || !question) return;
    const isCorrect = question.answer.trim().toLowerCase() === answer.trim().toLowerCase();
    setFeedback(isCorrect ? 'correct' : 'wrong');
    answerQuiz({ gameId: game.id, questionId: question.id, answer });
  }

  const opts: string[] = question.questionType === 'mcq'
    ? (() => { try { return JSON.parse(question.options); } catch { return []; } })()
    : question.questionType === 'tf'
      ? ['true', 'false']
      : [];

  const disabled = cooldownRemaining > 0;
  // Avoid "unused var" lint on `now` — it drives re-renders for the cooldown text.
  void now;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-wider">
        <span>Quiz</span>
        <span className="text-accent normal-case">+{REWARD} Energy / correct</span>
      </div>

      <div className="text-sm text-text leading-[1.6]">{question.prompt}</div>

      {opts.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {opts.map(opt => (
            <button
              key={opt}
              onClick={() => { setSelected(opt); submit(opt); }}
              disabled={disabled}
              className={[
                'px-3 py-2 rounded-md text-left text-xs font-semibold transition-all',
                disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-bg cursor-pointer',
                selected === opt ? 'bg-bg text-accent' : 'text-text',
              ].join(' ')}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <form
          onSubmit={e => { e.preventDefault(); submit(typed); }}
          className="flex gap-2"
        >
          <input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            disabled={disabled}
            placeholder="Type your answer…"
            className="input-field flex-1 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={disabled || !typed.trim()}
            className="px-3 py-2 rounded-md bg-accent text-white text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </form>
      )}

      <div className="text-[11px] text-text-faint">
        {feedback === 'correct' && <span className="text-green font-semibold">Correct! +{REWARD} Energy</span>}
        {feedback === 'wrong'   && <span className="text-red   font-semibold">Wrong answer</span>}
        {!feedback && (
          cooldownRemaining > 0
            ? <>Cooldown: {cooldownRemaining}s</>
            : <>Ready — answer for +{REWARD} Energy</>
        )}
      </div>
    </div>
  );
}
