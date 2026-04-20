import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { MLTaskType, MLExecutionOutput } from './types';
import { getPythonWrapper } from './templates';

const TEMP_DIR = '/tmp/ml-quest-ml';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.ML_JUDGE_TIMEOUT_MS || '60000');

export class MLExecutor {
    constructor(private readonly tempBase: string = TEMP_DIR) {
        if (!fs.existsSync(this.tempBase)) {
            fs.mkdirSync(this.tempBase, { recursive: true });
        }
    }

    async execute(
        submissionId: string,
        code: string,
        taskType: MLTaskType,
        timeoutMs: number = DEFAULT_TIMEOUT_MS
    ): Promise<MLExecutionOutput> {
        const dir = path.join(this.tempBase, submissionId);
        fs.mkdirSync(dir, { recursive: true });

        // Wrap user code with the task-specific wrapper
        const wrappedCode = getPythonWrapper(taskType, code);
        const scriptPath = path.join(dir, 'ml_solution.py');
        fs.writeFileSync(scriptPath, wrappedCode, 'utf-8');

        return this.runPython(scriptPath, timeoutMs);
    }

    private runPython(
        scriptPath: string,
        timeoutMs: number
    ): Promise<MLExecutionOutput> {
        return new Promise((resolve) => {
            const startTime = Date.now();
            let stdout = '';
            let stderr = '';
            let peakMemoryMb = 0;
            let timedOut = false;

            const proc = spawn('python3', [scriptPath], {
                cwd: path.dirname(scriptPath),
                env: { ...process.env, PYTHONUNBUFFERED: '1' },
            });

            // Memory monitor every 200ms
            const memMonitor = setInterval(() => {
                if (!proc.pid) return;
                try {
                    const { execSync } = require('child_process');
                    const rssKb = parseInt(
                        execSync(`ps -p ${proc.pid} -o rss=`, { encoding: 'utf-8' }).trim()
                    );
                    if (!isNaN(rssKb)) {
                        peakMemoryMb = Math.max(peakMemoryMb, Math.round(rssKb / 1024));
                    }
                } catch {
                    // process may have exited
                }
            }, 200);

            const timer = setTimeout(() => {
                timedOut = true;
                clearInterval(memMonitor);
                proc.kill('SIGKILL');
            }, timeoutMs);

            proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
            proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

            proc.on('close', (exitCode) => {
                clearTimeout(timer);
                clearInterval(memMonitor);
                const runtimeMs = Date.now() - startTime;

                // Extract __ML_RESULTS__ JSON block
                const mlResults = extractMLResults(stdout);

                resolve({
                    stdout,
                    stderr,
                    runtimeMs,
                    memoryMb: peakMemoryMb,
                    mlResults,
                    timedOut,
                    exitCode,
                });
            });

            proc.on('error', (err) => {
                clearTimeout(timer);
                clearInterval(memMonitor);
                resolve({
                    stdout,
                    stderr: err.message,
                    runtimeMs: Date.now() - startTime,
                    memoryMb: peakMemoryMb,
                    timedOut: false,
                    exitCode: -1,
                });
            });
        });
    }

    cleanup(submissionId: string): void {
        const dir = path.join(this.tempBase, submissionId);
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }
}

/**
 * Extracts the JSON payload printed between __ML_RESULTS_START__ and __ML_RESULTS_END__
 * markers injected by the Python wrapper template.
 */
function extractMLResults(stdout: string): Record<string, unknown> | undefined {
    const START = '__ML_RESULTS_START__';
    const END = '__ML_RESULTS_END__';

    const startIdx = stdout.indexOf(START);
    const endIdx = stdout.indexOf(END);

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        return undefined;
    }

    const jsonStr = stdout.slice(startIdx + START.length, endIdx).trim();
    try {
        return JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
        return undefined;
    }
}
