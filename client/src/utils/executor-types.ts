export interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
}

export interface ExecuteResponse {
  success: boolean;
  passed: number;
  total: number;
  results: TestResult[];
  compile_error?: string;
  runtime_error?: string;
}
