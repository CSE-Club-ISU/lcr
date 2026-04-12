import type { Language } from '../types.js';

export interface ProblemData {
  kind: 'algorithm' | 'data_structure';
  method_name: string;
  test_cases: string[];
  test_results: string[];
  compare_func: string;
}

export function getFileExtension(lang: Language): string {
  switch (lang) {
    case 'python': return '.py';
    case 'java':   return '.java';
    case 'cpp':    return '.cpp';
  }
}

export function getDockerImage(lang: Language): string {
  switch (lang) {
    case 'python': return process.env.DOCKER_IMAGE_PYTHON ?? 'python:3.12-slim';
    case 'java':   return process.env.DOCKER_IMAGE_JAVA   ?? 'openjdk:21-slim';
    case 'cpp':    return process.env.DOCKER_IMAGE_CPP    ?? 'gcc:13';
  }
}

export function getTimeLimitMs(lang: Language): number {
  switch (lang) {
    case 'python': return parseInt(process.env.DOCKER_PYTHON_TIME_LIMIT_MS ?? '5000');
    case 'java':   return parseInt(process.env.DOCKER_JAVA_TIME_LIMIT_MS   ?? '8000');
    case 'cpp':    return parseInt(process.env.DOCKER_CPP_TIME_LIMIT_MS    ?? '5000');
  }
}

export function generateTestFile(code: string, lang: Language, problemData: ProblemData): string {
  switch (lang) {
    case 'python': return generatePython(code, problemData);
    case 'java':   return generateJava(code, problemData);
    case 'cpp':    return generateCpp(code, problemData);
  }
}

// ---------------------------------------------------------------------------
// Python test runner
// ---------------------------------------------------------------------------
function generatePython(code: string, problem: ProblemData): string {
  if (problem.kind === 'data_structure') {
    return generatePythonDataStructure(code, problem);
  }
  return generatePythonAlgorithm(code, problem);
}

function generatePythonAlgorithm(code: string, problem: ProblemData): string {
  const testData = problem.test_cases.map((tc, i) => ({
    input: tc,
    expected: problem.test_results[i],
  }));

  return `
import json, sys

${code}

${problem.compare_func}

test_data = ${JSON.stringify(testData)}
results = []

for td in test_data:
    try:
        args = json.loads(td["input"])
        expected = json.loads(td["expected"])
        actual = ${problem.method_name}(*args) if isinstance(args, list) else ${problem.method_name}(args)
        passed = compare(actual, expected)
        results.append({"passed": passed, "input": td["input"], "expected": td["expected"], "actual": json.dumps(actual)})
    except Exception as e:
        results.append({"passed": False, "input": td["input"], "expected": td["expected"], "actual": "", "error": str(e)})

print(json.dumps({"results": results}))
`.trimStart();
}

// data_structure harness: each test case is a JSON array of operations,
// e.g. [["push",1],["push",2],["pop"]]. The class is instantiated once per
// test case. The result of the LAST operation is compared against expected.
function generatePythonDataStructure(code: string, problem: ProblemData): string {
  const testData = problem.test_cases.map((tc, i) => ({
    input: tc,
    expected: problem.test_results[i],
  }));

  return `
import json, sys

${code}

${problem.compare_func}

test_data = ${JSON.stringify(testData)}
results = []

for td in test_data:
    try:
        ops = json.loads(td["input"])
        expected = json.loads(td["expected"])
        obj = ${problem.method_name}()
        actual = None
        for op in ops:
            method = op[0]
            args = op[1:] if len(op) > 1 else []
            actual = getattr(obj, method)(*args)
        passed = compare(actual, expected)
        results.append({"passed": passed, "input": td["input"], "expected": td["expected"], "actual": json.dumps(actual)})
    except Exception as e:
        results.append({"passed": False, "input": td["input"], "expected": td["expected"], "actual": "", "error": str(e)})

print(json.dumps({"results": results}))
`.trimStart();
}

// ---------------------------------------------------------------------------
// Java test runner (placeholder — expand in Phase 2)
// ---------------------------------------------------------------------------
function generateJava(code: string, problem: ProblemData): string {
  // TODO: full Java runner in Phase 2
  return `// Java runner placeholder\npublic class solution { public static void main(String[] args) { System.out.println("{\\"results\\":[]}"); } }`;
}

// ---------------------------------------------------------------------------
// C++ test runner (placeholder — expand in Phase 2)
// ---------------------------------------------------------------------------
function generateCpp(code: string, problem: ProblemData): string {
  // TODO: full C++ runner in Phase 2
  return `#include<iostream>\nint main(){ std::cout << "{\\"results\\":[]}" << std::endl; return 0; }`;
}
