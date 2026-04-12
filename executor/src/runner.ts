import type { ExecuteRequest, ExecuteResult } from './types.js';
import { generateTestFile, getFileExtension, getDockerImage, getTimeLimitMs } from './generators/index.js';

const CPU_LIMIT = process.env.DOCKER_CPU_LIMIT ?? '0.5';

const memoryLimit: Record<string, string> = {
  python: process.env.DOCKER_PYTHON_MEMORY ?? '128m',
  java:   process.env.DOCKER_JAVA_MEMORY   ?? '256m',
  cpp:    process.env.DOCKER_CPP_MEMORY    ?? '128m',
};

export interface ProblemData {
  kind: 'algorithm' | 'data_structure';
  method_name: string;
  test_cases: string[];        // JSON strings (sample or hidden based on mode)
  test_results: string[];      // Expected outputs
  compare_func: string;        // Language-specific comparison logic
}

export async function executeCode(
  req: ExecuteRequest,
  problemData: ProblemData
): Promise<ExecuteResult> {
  const ext = getFileExtension(req.lang);
  const fileName = `solution${ext}`;

  const testFileContent = generateTestFile(req.code, req.lang, problemData);

  const image = getDockerImage(req.lang);
  const timeLimit = getTimeLimitMs(req.lang);
  const mem = memoryLimit[req.lang] ?? '128m';

  const result = await runInDocker({
    image,
    fileName,
    code: testFileContent,
    lang: req.lang,
    timeLimit,
    mem,
  });

  return parseDockerOutput(result, problemData.test_cases.length);
}

interface DockerRunOptions {
  image: string;
  fileName: string;
  code: string;
  lang: string;
  timeLimit: number;
  mem: string;
}

async function runInDocker(opts: DockerRunOptions): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { image, fileName, code, lang, timeLimit, mem } = opts;

  // Write code via stdin into the container's /tmp, then execute.
  // This avoids host path issues when the executor runs inside Docker
  // (DinD): the host Docker daemon can't see paths inside this container.
  const runScript = getRunScript(lang, fileName);

  const proc = Bun.spawn([
    'docker', 'run',
    '--rm',
    '--network=none',
    `--memory=${mem}`,
    '--memory-swap=0',
    `--cpus=${CPU_LIMIT}`,
    '--pids-limit=50',
    '--security-opt=no-new-privileges',
    '--tmpfs=/tmp:size=32m,exec',
    '-i',
    image,
    'sh', '-c', runScript,
  ], {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: new TextEncoder().encode(code),
  });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Time limit exceeded')), timeLimit)
  );

  try {
    await Promise.race([proc.exited, timeout]);
  } catch (err) {
    proc.kill();
    return { stdout: '', stderr: String(err), exitCode: 1 };
  }

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = proc.exitCode ?? 1;

  return { stdout, stderr, exitCode };
}

// Returns a sh -c script that reads code from stdin, writes it to /tmp, then runs it.
function getRunScript(lang: string, fileName: string): string {
  const dest = `/tmp/${fileName}`;
  switch (lang) {
    case 'python':
      return `cat > ${dest} && python3 ${dest}`;
    case 'java':
      return `cat > ${dest} && cd /tmp && javac ${fileName} && java ${fileName.replace('.java', '')}`;
    case 'cpp':
      return `cat > ${dest} && cd /tmp && g++ -O2 -o solution ${fileName} && ./solution`;
    default:
      throw new Error(`Unsupported language: ${lang}`);
  }
}

function parseDockerOutput(
  result: { stdout: string; stderr: string; exitCode: number },
  total: number,
): ExecuteResult {
  if (result.exitCode !== 0 && !result.stdout) {
    return {
      success: false,
      passed: 0,
      total,
      results: [],
      compile_error: result.stderr || 'Unknown error',
    };
  }

  // Expect stdout to be JSON: { results: TestResult[] }
  try {
    const parsed = JSON.parse(result.stdout);
    const passed = parsed.results.filter((r: { passed: boolean }) => r.passed).length;
    return {
      success: true,
      passed,
      total,
      results: parsed.results,
    };
  } catch {
    return {
      success: false,
      passed: 0,
      total,
      results: [],
      runtime_error: result.stderr || result.stdout || 'Failed to parse output',
    };
  }
}
