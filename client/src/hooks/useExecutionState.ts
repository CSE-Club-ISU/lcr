import { useReducer } from 'react';
import type { TestResult } from '../utils/executor-types';
import type { QuizResult } from '../components/powerup/QuizPanel';

/**
 * Manages the execution panel state (test results, run/submit loading flags, errors).
 *
 * Teaching note: when a component has 5+ related state variables that change
 * together, useReducer gives you a central place to define valid transitions.
 * Compare to useState: with useState you can set error while accidentally
 * leaving stale testResults visible; the reducer clears them atomically.
 */
interface ExecutionState {
  running: boolean;
  submitting: boolean;
  testResults: TestResult[] | null;
  runSummary: string | null;
  error: string | null;
  quizResult: QuizResult | null;
}

type ExecutionAction =
  | { type: 'RUN_START' }
  | { type: 'RUN_DONE'; testResults: TestResult[]; summary: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_DONE'; testResults: TestResult[]; summary: string }
  | { type: 'ERROR'; message: string }
  | { type: 'QUIZ_RESULT'; result: QuizResult }
  | { type: 'CLEAR' };

const initialState: ExecutionState = {
  running: false,
  submitting: false,
  testResults: null,
  runSummary: null,
  error: null,
  quizResult: null,
};

function executionReducer(state: ExecutionState, action: ExecutionAction): ExecutionState {
  switch (action.type) {
    case 'RUN_START':
      return { ...state, running: true, error: null, testResults: null, runSummary: null, quizResult: null };
    case 'RUN_DONE':
      return { ...state, running: false, testResults: action.testResults, runSummary: action.summary };
    case 'SUBMIT_START':
      return { ...state, submitting: true, error: null, testResults: null, runSummary: null, quizResult: null };
    case 'SUBMIT_DONE':
      return { ...state, submitting: false, testResults: action.testResults, runSummary: action.summary };
    case 'ERROR':
      return { ...state, running: false, submitting: false, error: action.message };
    case 'QUIZ_RESULT':
      return { ...state, quizResult: action.result };
    case 'CLEAR':
      return initialState;
  }
}

export function useExecutionState() {
  const [state, dispatch] = useReducer(executionReducer, initialState);
  return { state, dispatch };
}
