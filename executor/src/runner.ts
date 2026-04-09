import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import type { ExecuteRequest, ExecuteResult } from './types';
import { generateTestFile, getFileExtension, getDockerImage, getTimeLimitMs } from './generators';

const CPU_LIMIT = process.env.DOCKER_CPU_LIMIT ?? '0.5';

const memoryLimit: Record<string, string> = {
  python: process.env.DOCKER_PYTHON_MEMORY ?? '128m',
  java:   process.env.DOCKER_JAVA_MEMORY   ?? '256m',
  cpp:    process.env.DOCKER_CPP_MEMORY    ?? '128m',
};

export async function executeCode(req: ExecuteRequest): Promise<ExecuteResult> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'lcr-'));

  try {
    const ext = getFileExtension(req.lang);
    const fileName = `solution${ext}`;
    const filePath = join(tmpDir, fileName);

    const testFileContent = generateTestFile(req);
    await writeFile(filePath, testFileContent, 'utf8');

    const image = getDockerImage(req.lang);
    const timeLimit = getTimeLimitMs(req.lang);
    const mem = memoryLimit[req.lang];

    const result = await runInDocker({
      image,
      filePath,
      fileName,
      lang: req.lang,
      timeLimit,
      mem,
    });

    return parseDockerOutput(result, req.hidden_test_cases.length);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

interface DockerRunOptions {
  image: string;
  filePath: string;
  fileName: string;
  lang: string;
  timeLimit: number;
  mem: string;
}

async function runInDocker(opts: DockerRunOptions): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { image, filePath, fileName, lang, timeLimit, mem } = opts;

  const runCmd = getRunCommand(lang, fileName);

  const proc = Bun.spawn([
    'docker', 'run',
    '--rm',
    '--network=none',
    `--memory=${mem}`,
    `--cpus=${CPU_LIMIT}`,
    '--read-only',
    '--tmpfs=/tmp',
    '-v', `${filePath}:/solution/${fileName}:ro`,
    '-w', '/solution',
    image,
    ...runCmd,
  ], {
    stdout: 'pipe',
    stderr: 'pipe',
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

function getRunCommand(lang: string, fileName: string): string[] {
  switch (lang) {
    case 'python':
      return ['python3', fileName];
    case 'java':
      // fileName is e.g. Solution.java — compile then run
      return ['sh', '-c', `javac ${fileName} && java ${fileName.replace('.java', '')}`];
    case 'cpp':
      return ['sh', '-c', `g++ -O2 -o solution ${fileName} && ./solution`];
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
