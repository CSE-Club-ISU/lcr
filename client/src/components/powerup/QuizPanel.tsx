import { useState, useEffect } from 'react';
import { useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../../module_bindings';
import type { QuizQuestion, GameState } from '../../module_bindings/types';
import { useTypedTable } from '../../utils/useTypedTable';
import { safeParseJson } from '../../utils/parseJson';

export type QuizResult =
  | { kind: 'correct'; reward: number }
  | { kind: 'wrong'; correctAnswer: string };

interface Props {
  game: GameState;
  isP1: boolean;
  onAnswered: (result: QuizResult) => void;
}

const COOLDOWN_SEC = 30;
const REWARD = 10;
const MAX_ANSWER_LEN = 200;

export default function QuizPanel({ game, isP1, onAnswered }: Props) {
  const [questions] = useTypedTable<QuizQuestion>(tables.quiz_question);
  const answerQuiz = useReducer(reducers.answerQuiz);

  const lastAtMicros = isP1 ? game.player1LastQuizAt.microsSinceUnixEpoch : game.player2LastQuizAt.microsSinceUnixEpoch;
  const startMicros  = game.startTime.microsSinceUnixEpoch;

  // Tick every 500ms to re-derive the cooldown countdown.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 500);
    return () => clearInterval(t);
  }, []);

  const neverAnswered = lastAtMicros === startMicros;
  const secsSinceLast = Math.floor((Date.now() - Number(lastAtMicros / 1000n)) / 1000);
  const cooldownRemaining = neverAnswered ? 0 : Math.max(0, COOLDOWN_SEC - secsSinceLast);

  // Pick a random index whenever the pool changes or the cooldown resets
  // (i.e. after the user just answered). Avoid showing the same question twice
  // in a row when there are at least two to choose from.
  const [questionIdx, setQuestionIdx] = useState<number>(() => 0);
  useEffect(() => {
    if (questions.length === 0) return;
    setQuestionIdx(prev => {
      if (questions.length === 1) return 0;
      let next = Math.floor(Math.random() * questions.length);
      if (next === prev) next = (next + 1) % questions.length;
      return next;
    });
  }, [questions.length, lastAtMicros]);

  const question: QuizQuestion | undefined = questions[questionIdx];

  const [selected, setSelected] = useState<string>('');
  const [typed, setTyped] = useState('');

  useEffect(() => {
    setSelected('');
    setTyped('');
  }, [question?.id]);

  if (questions.length === 0) {
    return <div className="text-xs text-text-muted">No quiz questions available.</div>;
  }
  if (!question) return null;

  function submit(raw: string) {
    const answer = raw.slice(0, MAX_ANSWER_LEN);
    if (!answer || cooldownRemaining > 0 || !question) return;
    const isCorrect = question.answer.trim().toLowerCase() === answer.trim().toLowerCase();
    answerQuiz({ gameId: game.id, questionId: question.id, answer });
    onAnswered(isCorrect
      ? { kind: 'correct', reward: REWARD }
      : { kind: 'wrong', correctAnswer: question.answer });
  }

  const opts: string[] = question.questionType === 'mcq'
    ? safeParseJson<string[]>(question.options, [], 'quiz options')
    : question.questionType === 'tf'
      ? ['true', 'false']
      : [];

  const disabled = cooldownRemaining > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[11px] font-bold text-text-muted uppercase tracking-wider">
        <span>Bonus Question</span>
        <span className="text-accent normal-case">+{REWARD} Energy if correct</span>
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
            onChange={e => setTyped(e.target.value.slice(0, MAX_ANSWER_LEN))}
            disabled={disabled}
            maxLength={MAX_ANSWER_LEN}
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
        {cooldownRemaining > 0
          ? <>Cooldown: {cooldownRemaining}s</>
          : <>Answer to earn +{REWARD} Energy</>}
      </div>
    </div>
  );
}
