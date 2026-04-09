export type Language = 'python' | 'java' | 'cpp';

export interface ExecuteRequest {
  game_id: string;
  player_identity: string;
  code: string;
  lang: Language;
  // Problem data — fetched from SpacetimeDB by the executor, not trusted from client
  // For now passed directly; later the executor will fetch from STDB by problem_id
  problem_id: number;
  method_name: string;
  hidden_test_cases: string[];
  hidden_test_results: string[];
  sample_test_cases: string[];
  sample_test_results: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  compare_func: string; // language-specific comparison function snippet
}

export interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
}

export interface ExecuteResult {
  success: boolean;
  passed: number;
  total: number;
  results: TestResult[];
  compile_error?: string;
  runtime_error?: string;
}
