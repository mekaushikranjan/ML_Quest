import { Pool } from 'pg';
import { query } from '@ml-quest/shared';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { Redis } from 'ioredis';

import { detectMLTaskType } from './detector';
import { MLExecutor } from './executor';
import { MLAnalyzer } from './analyzer';
import { MLStorage } from './storage';
import { MLQueue } from './ml-queue.service';
import { ML_PROBLEMS, runMLTestCases } from '../ml-problems/ml-problems.data';

import {
    MLSubmissionDto,
    MLSubmissionJobData,
    MLSubmissionRecord,
    MLSubmissionResultRecord,
    MLTaskType,
} from './types';

const ML_RATE_LIMIT_SECONDS = 10; // slightly more lenient than standard judge

export class MLSubmissionService {
    private queue: MLQueue;
    private executor: MLExecutor;
    private analyzer: MLAnalyzer;
    private storage: MLStorage;

    constructor(
        private readonly db: Pool,
        private readonly redis: Redis,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private readonly logger: any
    ) {
        this.queue = new MLQueue(logger);
        this.executor = new MLExecutor();
        this.analyzer = new MLAnalyzer();
        this.storage = new MLStorage();
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Creates an ML submission record and enqueues it for processing.
     */
    async createMLSubmission(dto: MLSubmissionDto): Promise<MLSubmissionRecord> {
        // Rate limit: 1 ML submission per 10 s per user
        const rateLimitKey = `ml_submission_ratelimit:${dto.userId}`;
        if (await this.redis.get(rateLimitKey)) {
            throw new Error('Too many ML submissions. Please wait 10 seconds before submitting again.');
        }

        // Detect task type early so it can be stored
        const taskType = detectMLTaskType(dto.code, dto.taskTypeHint);

        const result = await query<any>(
            this.db,
            this.logger,
            `INSERT INTO ml_submissions (user_id, problem_id, code, task_type, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING
         id,
         user_id      AS "userId",
         problem_id   AS "problemId",
         task_type    AS "taskType",
         status,
         s3_result_key AS "s3ResultKey",
         error_message AS "errorMessage",
         runtime_ms   AS "runtimeMs",
         memory_mb    AS "memoryMb",
         created_at   AS "createdAt",
         updated_at   AS "updatedAt"`,
            [dto.userId, dto.problemId ?? null, dto.code, taskType]
        );

        if (!result.length) throw new Error('Failed to create ML submission');

        // Set rate limit
        await this.redis.setex(rateLimitKey, ML_RATE_LIMIT_SECONDS, '1');

        const submission = result[0] as MLSubmissionRecord;

        // Enqueue for async processing
        try {
            await this.queue.enqueue({
                mlSubmissionId: submission.id,
                userId: dto.userId,
                code: dto.code,
                taskTypeHint: dto.taskTypeHint,
                problemId: dto.problemId,
            } satisfies MLSubmissionJobData);
        } catch (err) {
            this.logger.error({ err, id: submission.id }, '[ML] Failed to enqueue ML submission');
        }

        this.logger.info({ id: submission.id, taskType }, '[ML] ML submission created');
        return submission;
    }

    /**
     * Core processing logic called by the ML worker.
     * detect → execute → analyze → store → update DB → publish
     */
    async processMLSubmission(jobData: MLSubmissionJobData): Promise<void> {
        const { mlSubmissionId, code, taskTypeHint } = jobData;

        try {
            // Mark as running
            await this.updateStatus(mlSubmissionId, 'running');
            await this.publish(mlSubmissionId, { status: 'running' });

            // 1. Detect task type
            const taskType = detectMLTaskType(code, taskTypeHint);
            this.logger.info({ mlSubmissionId, taskType }, '[ML] Task type detected');

            // 2. Execute
            const execOutput = await this.executor.execute(mlSubmissionId, code, taskType);

            // 3. Analyze
            const analysis = this.analyzer.analyze(execOutput, taskType);

            // 3b. Run test cases (if this submission belongs to a known ML problem)
            let testCaseResults: ReturnType<typeof runMLTestCases> = [];
            if (jobData.problemId) {
                const problem = ML_PROBLEMS.find(
                    (p) => p.id === jobData.problemId || p.slug === jobData.problemId
                );
                if (problem?.testCases?.length) {
                    testCaseResults = runMLTestCases(
                        problem.testCases,
                        execOutput.stdout || '',
                        (analysis.metrics || []) as any
                    );
                    this.logger.info(
                        { mlSubmissionId, passed: testCaseResults.filter((t) => t.passed).length, total: testCaseResults.length },
                        '[ML] Test cases evaluated'
                    );
                }
            }
            (analysis as any).testCaseResults = testCaseResults;

            // 4. Store result to S3
            let s3ResultKey: string | undefined;
            try {
                s3ResultKey = await this.storage.saveMLResult(mlSubmissionId, analysis);
            } catch (err) {
                this.logger.warn({ err, mlSubmissionId }, '[ML] Failed to save result to S3 (continuing)');
            }

            // 5. Persist result to DB
            await this.saveMLResult(mlSubmissionId, analysis);

            // 6. Update submission status
            const finalStatus = execOutput.timedOut
                ? 'timeout'
                : execOutput.exitCode !== 0 && !execOutput.mlResults
                    ? 'runtime_error'
                    : 'completed';

            await this.updateStatus(
                mlSubmissionId,
                finalStatus,
                execOutput.runtimeMs,
                execOutput.memoryMb,
                s3ResultKey,
                analysis.warnings.length > 0 ? analysis.warnings[0] : undefined
            );

            // 7. Publish final result via Redis pub/sub (SSE consumers)
            await this.publish(mlSubmissionId, {
                status: finalStatus,
                taskType,
                summary: analysis.summary,
                runtimeMs: execOutput.runtimeMs,
            });

            this.logger.info({ mlSubmissionId, finalStatus, taskType }, '[ML] Processing complete');

        } catch (err) {
            const msg = (err as Error).message;
            this.logger.error({ err, mlSubmissionId }, '[ML] Processing failed');
            await this.updateStatus(mlSubmissionId, 'failed', 0, 0, undefined, msg);
            await this.publish(mlSubmissionId, { status: 'failed', error: msg });
        } finally {
            this.executor.cleanup(mlSubmissionId);
        }
    }

    async getMLSubmission(id: string): Promise<MLSubmissionRecord> {
        const result = await query<any>(
            this.db,
            this.logger,
            `SELECT
         id,
         user_id      AS "userId",
         problem_id   AS "problemId",
         task_type    AS "taskType",
         status,
         s3_result_key AS "s3ResultKey",
         error_message AS "errorMessage",
         runtime_ms   AS "runtimeMs",
         memory_mb    AS "memoryMb",
         created_at   AS "createdAt",
         updated_at   AS "updatedAt"
       FROM ml_submissions
       WHERE id = $1`,
            [id]
        );

        if (!result.length) throw new Error('ML submission not found');
        return result[0] as MLSubmissionRecord;
    }

    async getUserMLSubmissions(userId: string, limit = 20, offset = 0): Promise<MLSubmissionRecord[]> {
        return query<any>(
            this.db,
            this.logger,
            `SELECT
         id,
         user_id      AS "userId",
         problem_id   AS "problemId",
         task_type    AS "taskType",
         status,
         error_message AS "errorMessage",
         runtime_ms   AS "runtimeMs",
         memory_mb    AS "memoryMb",
         created_at   AS "createdAt",
         updated_at   AS "updatedAt"
       FROM ml_submissions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
    }

    /**
     * Returns the stored analysis result for a completed submission.
     * First tries the DB (faster), falls back to S3 if DB row missing.
     */
    async getMLResult(submissionId: string): Promise<MLSubmissionResultRecord | null> {
        const rows = await query<any>(
            this.db,
            this.logger,
            `SELECT
         id,
         submission_id AS "submissionId",
         task_type     AS "taskType",
         summary,
         metrics,
         insights,
         warnings,
         raw_output    AS "rawOutput",
         created_at    AS "createdAt"
       FROM ml_submission_results
       WHERE submission_id = $1
       LIMIT 1`,
            [submissionId]
        );

        if (rows.length) {
            const row = rows[0] as MLSubmissionResultRecord;
            // Parse testCaseResults out of raw_output JSON if present
            try {
                if (row.rawOutput && row.rawOutput.startsWith('{')) {
                    const parsed = JSON.parse(row.rawOutput);
                    row.testCaseResults = parsed.testCaseResults ?? [];
                    row.rawOutput = parsed.stdout ?? row.rawOutput;
                }
            } catch { /* rawOutput may be plain text in older rows */ }
            return row;
        }

        // Fallback: fetch submission to get s3 key then download
        const submission = await this.getMLSubmission(submissionId);
        if (submission.s3ResultKey) {
            try {
                const analysis = await this.storage.getMLResult(submission.s3ResultKey);
                return {
                    id: '',
                    submissionId,
                    taskType: analysis.taskType,
                    summary: analysis.summary,
                    metrics: analysis.metrics,
                    insights: analysis.insights,
                    warnings: analysis.warnings,
                    rawOutput: analysis.rawOutput,
                    createdAt: submission.updatedAt,
                } as MLSubmissionResultRecord;
            } catch (err) {
                this.logger.warn({ err, submissionId }, '[ML] Failed to fetch result from S3');
            }
        }

        return null;
    }

    async getQueueDepth(): Promise<number> {
        return this.queue.getDepth();
    }

    /**
     * Returns the list of supported ML task types with descriptions.
     */
    getSupportedTaskTypes(): Array<{ type: MLTaskType; description: string }> {
        return [
            { type: MLTaskType.CLUSTERING, description: 'K-Means, DBSCAN, Agglomerative, etc.' },
            { type: MLTaskType.REGRESSION, description: 'Linear, Ridge, Lasso, Random Forest Regressor, etc.' },
            { type: MLTaskType.CLASSIFICATION, description: 'Logistic Regression, SVM, Random Forest Classifier, etc.' },
            { type: MLTaskType.DATAFRAME_ANALYSIS, description: 'Pandas DataFrame EDA, describe, groupby, correlations' },
            { type: MLTaskType.NEURAL_NETWORK, description: 'Keras, TensorFlow, PyTorch models' },
            { type: MLTaskType.DIMENSIONALITY_REDUCTION, description: 'PCA, t-SNE, UMAP, FastICA, NMF' },
            { type: MLTaskType.GENERAL, description: 'Any Python code — generic execution and output capture' },
        ];
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    private async saveMLResult(submissionId: string, analysis: import('./types').MLAnalysisResult & { testCaseResults?: any[] }): Promise<void> {
        await query(
            this.db,
            this.logger,
            `INSERT INTO ml_submission_results
         (submission_id, task_type, summary, metrics, insights, warnings, raw_output)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                submissionId,
                analysis.taskType,
                analysis.summary,
                JSON.stringify(analysis.metrics),
                JSON.stringify(analysis.insights),
                JSON.stringify(analysis.warnings),
                JSON.stringify({
                    stdout: (analysis.rawOutput || '').slice(0, 48_000),
                    testCaseResults: analysis.testCaseResults || [],
                }),
            ]
        );
    }

    private async updateStatus(
        id: string,
        status: string,
        runtimeMs = 0,
        memoryMb = 0,
        s3ResultKey?: string,
        errorMessage?: string
    ): Promise<void> {
        await query(
            this.db,
            this.logger,
            `UPDATE ml_submissions
       SET status        = $2,
           runtime_ms    = COALESCE($3, runtime_ms),
           memory_mb     = COALESCE($4, memory_mb),
           s3_result_key = COALESCE($5, s3_result_key),
           error_message = COALESCE($6, error_message),
           updated_at    = NOW()
       WHERE id = $1`,
            [id, status, runtimeMs, memoryMb, s3ResultKey ?? null, errorMessage ?? null]
        );
    }

    private async publish(id: string, data: unknown): Promise<void> {
        await this.redis.publish(`ml_submission:${id}`, JSON.stringify(data));
    }

    async getLatestAcceptedCode(userId: string, problemId: string): Promise<{ code: string } | null> {
        const result = await query<any>(
            this.db,
            this.logger,
            `SELECT code
             FROM ml_submissions
             WHERE user_id = $1 AND problem_id = $2 AND status = 'completed'
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId, problemId]
        );

        if (!result.length) {
            return null;
        }

        return result[0];
    }
}
