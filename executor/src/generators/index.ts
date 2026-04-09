import type { ExecuteRequest, Language } from '../types';

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

export function generateTestFile(req: ExecuteRequest): string {
  switch (req.lang) {
    case 'python': return generatePython(req);
    case 'java':   return generateJava(req);
    case 'cpp':    return generateCpp(req);
  }
}

// ---------------------------------------------------------------------------
// Python test runner
// ---------------------------------------------------------------------------
function generatePython(req: ExecuteRequest): string {
  const testData = req.hidden_test_cases.map((tc, i) => ({
    input: tc,
    expected: req.hidden_test_results[i],
  }));

  return `
import json, sys

${req.code}

def compare(actual, expected):
${req.compare_func.split('\n').map(l => '    ' + l).join('\n')}

test_data = ${JSON.stringify(testData)}
results = []

for td in test_data:
    try:
        args = json.loads(td["input"])
        expected = json.loads(td["expected"])
        actual = ${req.method_name}(*args) if isinstance(args, list) else ${req.method_name}(args)
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
function generateJava(req: ExecuteRequest): string {
  // TODO: full Java runner in Phase 2
  return `// Java runner placeholder\npublic class solution { public static void main(String[] args) { System.out.println("{\\"results\\":[]}"); } }`;
}

// ---------------------------------------------------------------------------
// C++ test runner (placeholder — expand in Phase 2)
// ---------------------------------------------------------------------------
function generateCpp(req: ExecuteRequest): string {
  // TODO: full C++ runner in Phase 2
  return `#include<iostream>\nint main(){ std::cout << "{\\"results\\":[]}" << std::endl; return 0; }`;
}
