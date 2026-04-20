import { Pool } from 'pg';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { Logger } from 'pino';
import type { Redis } from 'ioredis';
import { query, createDbPool } from '@ml-quest/shared';

const execAsync = promisify(exec);

interface TestCase {
  id: string;
  inputKey: string;
  outputKey: string;
  isSample: boolean;
}

interface TestResult {
  testCaseId: string;
  status: 'passed' | 'failed' | 'runtime_error' | 'timeout';
  actualOutput: string;
  expectedOutput: string;
  runtimeMs: number;
  memoryMb: number;
  errorMessage?: string;
}

export class JudgeService {
  private s3Client: S3Client;
  private tempDir = '/tmp/ml-quest';
  // Separate DB connection for reading problems/test cases
  private problemsDb: Pool;

  constructor(
    private db: Pool,        // ml_quest_submissions
    private redis: Redis,
    private logger: Logger
  ) {
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'eu-north-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    });

    // Connect to problems DB to read test cases
    this.problemsDb = createDbPool(
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.PROBLEMS_DB_NAME || 'ml_quest_problems',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      },
      logger as any
    );

    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async judgeSubmission(
    submissionId: string,
    problemId: string,
    code: string,
    language: string,
    isRunOnly: boolean = false
  ): Promise<void> {
    try {
      // 1. Mark as running + notify via Redis pub/sub
      await this.updateSubmissionStatus(submissionId, 'running');
      await this.publishUpdate(submissionId, { status: 'running' });

      let testCases: TestCase[] = [];
      try {
        testCases = await this.getTestCases(problemId, isRunOnly);
      } catch (err) {
        throw new Error('Failed to fetch test cases');
      }

      if (!testCases || !testCases.length) {
        throw new Error('No test cases found for this problem');
      }

      this.logger.info(
        { submissionId, testCaseCount: testCases.length },
        'Starting judgment'
      );

      // 3. Compile / prepare code
      const executablePath = await this.compileCode(code, language, submissionId);

      // 4. Run each test case
      const results: TestResult[] = [];
      let passedCount = 0;
      let finalStatus = 'accepted';

      for (const testCase of testCases) {
        const result = await this.executeTestCase(
          executablePath,
          testCase,
          language,
          submissionId
        );

        results.push(result);

        if (result.status === 'passed') {
          passedCount++;
        } else if (finalStatus === 'accepted') {
          finalStatus = result.status === 'timeout'
            ? 'time_limit_exceeded'
            : result.status === 'runtime_error'
              ? 'runtime_error'
              : 'wrong_answer';
        }

        // Publish progress to client via SSE
        await this.publishUpdate(submissionId, {
          status: 'running',
          passedTests: passedCount,
          totalTests: testCases.length,
        });
      }

      // 5. Calculate metrics
      const avgRuntime = results.length
        ? Math.round(results.reduce((sum, r) => sum + r.runtimeMs, 0) / results.length)
        : 0;
      const peakMemory = results.length
        ? Math.max(...results.map(r => r.memoryMb))
        : 0;

      // 6. Save per-test-case results
      for (const result of results) {
        await query(
          this.db,
          this.logger as any,
          `INSERT INTO test_case_results
           (submission_id, test_case_id, status, actual_output,
            expected_output, error_message, runtime_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            submissionId,
            result.testCaseId,
            result.status,
            result.actualOutput,
            result.expectedOutput,
            result.errorMessage || null,
            result.runtimeMs,
          ]
        );
      }

      // 7. Update submission final status
      await this.updateSubmissionStatus(
        submissionId,
        finalStatus,
        passedCount,
        testCases.length,
        avgRuntime,
        peakMemory,
        results.find(r => r.errorMessage)?.errorMessage
      );

      // 8. Publish final result — SSE client will close on this
      await this.publishUpdate(submissionId, {
        status: finalStatus,
        passedTests: passedCount,
        totalTests: testCases.length,
        runtimeMs: avgRuntime,
      });

      this.logger.info(
        { submissionId, finalStatus, passedCount, total: testCases.length },
        'Judgment complete'
      );

    } catch (err) {
      this.logger.error({ err, submissionId }, 'Judgment failed');
      const msg = (err as Error).message;
      const tStatus = msg.includes('Compilation error') ? 'compilation_error' : 'runtime_error';

      // Use a testCases array if we managed to load them before the crash
      // Fallback to 0 if they failed to load entirely.
      const totalCount = 0; // if we couldn't properly execute, we don't have per-test data, but we could pass the length if we scoped it. But for complete failures like compile errors we don't have results.

      await this.updateSubmissionStatus(
        submissionId, tStatus, 0, 0, 0, 0,
        msg
      );

      await this.publishUpdate(submissionId, {
        status: tStatus,
        error: msg,
      });
    } finally {
      await this.cleanup(submissionId);
    }
  }

  // ─── PRIVATE ──────────────────────────────────────────────

  private async getTestCases(problemId: string, isRunOnly: boolean = false): Promise<TestCase[]> {
    // Read from problems DB — not submissions DB
    const sql = isRunOnly
      ? `SELECT
           id,
           s3_input_key  AS "inputKey",
           s3_output_key AS "outputKey",
           is_sample     AS "isSample"
         FROM test_cases
         WHERE problem_id = $1 AND is_sample = true
         ORDER BY is_sample DESC, created_at ASC`
      : `SELECT
           id,
           s3_input_key  AS "inputKey",
           s3_output_key AS "outputKey",
           is_sample     AS "isSample"
         FROM test_cases
         WHERE problem_id = $1
         ORDER BY is_sample DESC, created_at ASC`;

    return query<any>(
      this.problemsDb,
      this.logger as any,
      sql,
      [problemId]
    );
  }

  private async compileCode(
    code: string,
    language: string,
    submissionId: string
  ): Promise<string> {
    const dir = path.join(this.tempDir, submissionId);
    fs.mkdirSync(dir, { recursive: true });

    // Simplified: Assuming compilers are available in the environment (e.g. inside Docker)
    if (language === 'go') {
      const file = path.join(dir, 'solution.go');
      fs.writeFileSync(file, code);

      try {
        const { stderr } = await execAsync(`bash -c "cd ${dir} && go build -o solution solution.go"`, { timeout: 30000 });
        if (stderr && !stderr.includes('warning')) throw new Error(`Compilation error: ${stderr}`);
        return path.join(dir, 'solution');
      } catch (err) {
        throw new Error(`Go compilation failed: ${(err as Error).message}`);
      }
    }

    switch (language) {
      case 'python': {
        const file = path.join(dir, 'solution.py');
        fs.writeFileSync(file, code);
        return file;
      }
      case 'javascript': {
        const file = path.join(dir, 'solution.js');
        fs.writeFileSync(file, code);
        return file;
      }
      case 'java': {
        const match = code.match(/public\s+class\s+(\w+)/);
        const className = match ? match[1] : 'Solution';
        const file = path.join(dir, `${className}.java`);
        fs.writeFileSync(file, code);
        const { stderr } = await execAsync(`bash -c "cd ${dir} && javac ${className}.java"`, { timeout: 30000, shell: '/bin/bash' });
        if (stderr) throw new Error(`Compilation error: ${stderr}`);
        return path.join(dir, `${className}.class`);
      }
      case 'cpp': {
        const file = path.join(dir, 'solution.cpp');
        fs.writeFileSync(file, code);
        const { stderr } = await execAsync(`bash -c "cd ${dir} && g++ -O2 -o solution solution.cpp"`, { timeout: 30000, shell: '/bin/bash' });
        if (stderr && stderr.includes('error')) throw new Error(`Compilation error: ${stderr}`);
        return path.join(dir, 'solution');
      }
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  private async executeTestCase(
    executablePath: string,
    testCase: TestCase,
    language: string,
    submissionId: string
  ): Promise<TestResult> {
    const startTime = Date.now();
    let expectedOutput = '';

    try {
      // Fetch input/expected output from S3 inside the try block
      const input = await this.getS3File(testCase.inputKey);
      expectedOutput = (await this.getS3File(testCase.outputKey)).trim();

      const { stdout, stderr, memoryMb } = await this.runProcess(executablePath, input, language);
      const runtimeMs = Date.now() - startTime;
      const actualOutput = stdout.trim();

      return {
        testCaseId: testCase.id,
        status: actualOutput === expectedOutput ? 'passed' : 'failed',
        actualOutput,
        expectedOutput,
        runtimeMs,
        memoryMb,
        errorMessage: stderr || undefined,
      };
    } catch (err) {
      const runtimeMs = Date.now() - startTime;
      const message = (err as Error).message;
      const isTimeout = message.includes('timeout');

      return {
        testCaseId: testCase.id,
        status: isTimeout ? 'timeout' : 'runtime_error',
        actualOutput: '',
        expectedOutput,
        runtimeMs,
        memoryMb: 0,
        errorMessage: message,
      };
    }
  }

  private runProcess(
    executablePath: string,
    input: string,
    language: string
  ): Promise<{ stdout: string; stderr: string; memoryMb: number }> {
    return new Promise((resolve, reject) => {
      const TIMEOUT_MS = parseInt(process.env.JUDGE_MAX_RUNTIME_MS || '10000');

      const commands: Record<string, string[]> = {
        python: ['python3', executablePath],
        javascript: ['node', executablePath],
        cpp: [executablePath],
        go: [executablePath],
        java: [
          'java',
          '-cp', path.dirname(executablePath),
          path.basename(executablePath, '.class'),
        ],
      };

      const [cmd, ...args] = commands[language] || [executablePath];
      const proc = spawn(cmd, args);

      let stdout = '';
      let stderr = '';
      let peakMemoryMb = 0;
      let memoryMonitor: ReturnType<typeof setInterval> | null = null;

      // Monitor memory usage every 100ms
      const startMemoryMonitoring = () => {
        memoryMonitor = setInterval(() => {
          try {
            const { execSync } = require('child_process');
            const rssKb = parseInt(
              execSync(`ps -p ${proc.pid} -o rss=`, { encoding: 'utf-8' }).trim()
            );
            const memoryMb = Math.round(rssKb / 1024);
            peakMemoryMb = Math.max(peakMemoryMb, memoryMb);
          } catch {
            // Process may have exited, continue
          }
        }, 100);
      };

      const timer = setTimeout(() => {
        if (memoryMonitor) clearInterval(memoryMonitor);
        proc.kill('SIGKILL');
        reject(new Error(`Execution timeout (>${TIMEOUT_MS}ms)`));
      }, TIMEOUT_MS);

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (memoryMonitor) clearInterval(memoryMonitor);
        if (code !== 0) {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
        } else {
          resolve({ stdout, stderr, memoryMb: peakMemoryMb });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        if (memoryMonitor) clearInterval(memoryMonitor);
        reject(err);
      });

      // Start monitoring after process spawns
      startMemoryMonitoring();

      if (input) {
        proc.stdin.write(input);
        proc.stdin.end();
      }
    });
  }

  private async getS3File(key: string): Promise<string> {
    // Handle local file paths (development/Docker with local files)
    if (key.startsWith('/')) {
      try {
        return fs.readFileSync(key, 'utf-8');
      } catch (err) {
        this.logger.error({ err, key }, 'Failed to read test case from local filesystem');
        throw err;
      }
    }

    // Handle S3 paths
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      })
    );

    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  private async updateSubmissionStatus(
    submissionId: string,
    status: string,
    passedTests = 0,
    totalTests = 0,
    runtimeMs = 0,
    memoryMb = 0,
    errorMessage?: string
  ): Promise<void> {
    await query(
      this.db,
      this.logger as any,
      `UPDATE submissions
       SET status = $1, passed_tests = $2, total_tests = $3,
           runtime_ms = $4, memory_mb = $5,
           error_message = $6, updated_at = NOW()
       WHERE id = $7`,
      [status, passedTests, totalTests, runtimeMs, memoryMb,
        errorMessage || null, submissionId]
    );
  }

  private async publishUpdate(submissionId: string, data: any): Promise<void> {
    await this.redis.publish(`submission:${submissionId}`, JSON.stringify(data));
  }

  private async cleanup(submissionId: string): Promise<void> {
    const dir = path.join(this.tempDir, submissionId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}