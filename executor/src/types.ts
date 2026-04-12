export type Language = 'python' | 'java' | 'cpp';

export interface ExecuteRequest {
  game_id: string;
  player_identity: string;
  code: string;
  lang: Language;
  problem_id: number;
  mode: 'run' | 'submit'; // 'run' = sample tests, 'submit' = hidden tests + call submit_result reducer
  solve_time: number; // seconds elapsed (client computes based on game start time)
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

export interface SandboxRequest {
  mode: 'sandbox';
  lang: Language;
  code: string;
  player_identity: string;
}

export interface SandboxResult {
  success: boolean;
  stdout?: string;
  compile_error?: string;
  runtime_error?: string;
}
