import { Pool } from 'pg';
import { query } from '@ml-quest/shared';
import { NotFoundError } from '@ml-quest/shared';
import type { Logger } from 'pino';
import type { Redis } from 'ioredis';
import { SubmissionQueue } from './queue.service';

export interface SubmissionDto {
  userId: string;
  problemId: string;
  code: string;
  language: string;
  isRunOnly?: boolean;
}

export interface SubmissionStatus {
  id: string;
  userId: string;
  problemId: string;
  status: string;
  passedTests: number;
  totalTests: number;
  runtimeMs?: number;
  memoryMb?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionJobData {
  submissionId: string;
  userId: string;
  problemId: string;
  code: string;
  language: string;
  isRunOnly?: boolean;
}

export class SubmissionService {
  private queue: SubmissionQueue;
  private readonly SUBMISSION_RATE_LIMIT_SECONDS = 5;

  constructor(
    private db: Pool,
    private redis: Redis,
    private logger: Logger
  ) {
    this.queue = new SubmissionQueue(redis, logger);
  }

  async createSubmission(dto: SubmissionDto): Promise<SubmissionStatus> {
    // Check rate limit: 1 submission per 5 seconds per user
    const rateLimitKey = `submission_ratelimit:${dto.userId}`;
    const lastSubmissionTime = await this.redis.get(rateLimitKey);

    if (lastSubmissionTime) {
      throw new Error('Too many submissions. Please wait 5 seconds before submitting again.');
    }

    const result = await query<any>(
      this.db,
      this.logger,
      `INSERT INTO submissions (user_id, problem_id, code, language, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING 
         id,
         user_id as "userId",
         problem_id as "problemId",
         status,
         passed_tests as "passedTests",
         total_tests as "totalTests",
         runtime_ms as "runtimeMs",
         memory_mb as "memoryMb",
         error_message as "errorMessage",
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [dto.userId, dto.problemId, dto.code, dto.language]
    );

    if (!result.length) {
      throw new Error('Failed to create submission');
    }

    // Set rate limit
    await this.redis.setex(rateLimitKey, this.SUBMISSION_RATE_LIMIT_SECONDS, Date.now().toString());

    // Queue submission for judge execution
    const submission = result[0];
    try {
      await this.queueForJudging(submission.id, dto);
    } catch (err) {
      this.logger.error({ err, submissionId: submission.id }, 'Failed to queue submission');
      // Still return the submission, judge will retry
    }

    this.logger.info(
      { submissionId: submission.id, userId: dto.userId, problemId: dto.problemId },
      'Submission created and queued'
    );

    return submission;
  }

  async queueForJudging(submissionId: string, dto: SubmissionDto): Promise<void> {
    await this.queue.queueSubmission({
      submissionId,
      userId: dto.userId,
      problemId: dto.problemId,
      code: dto.code,
      language: dto.language,
      isRunOnly: dto.isRunOnly,
    });
  }

  async getQueueDepth(): Promise<number> {
    return this.queue.getQueueDepth();
  }

  async getSubmission(submissionId: string): Promise<SubmissionStatus> {
    const result = await query<any>(
      this.db,
      this.logger,
      `SELECT 
         id,
         user_id as "userId",
         problem_id as "problemId",
         status,
         passed_tests as "passedTests",
         total_tests as "totalTests",
         runtime_ms as "runtimeMs",
         memory_mb as "memoryMb",
         error_message as "errorMessage",
         created_at as "createdAt",
         updated_at as "updatedAt"
       FROM submissions
       WHERE id = $1`,
      [submissionId]
    );

    if (!result.length) {
      throw new NotFoundError('Submission');
    }

    return result[0];
  }

  async getSubmissionWithCode(submissionId: string): Promise<any> {
    const result = await query<any>(
      this.db,
      this.logger,
      `SELECT 
         id,
         user_id as "userId",
         problem_id as "problemId",
         code,
         language,
         status,
         passed_tests as "passedTests",
         total_tests as "totalTests",
         runtime_ms as "runtimeMs",
         memory_mb as "memoryMb",
         error_message as "errorMessage",
         created_at as "createdAt",
         updated_at as "updatedAt"
       FROM submissions
       WHERE id = $1`,
      [submissionId]
    );

    if (!result.length) {
      throw new NotFoundError('Submission');
    }

    return result[0];
  }

  async getUserSubmissions(userId: string, problemId?: string, limit = 20, offset = 0): Promise<any> {
    let sql = `SELECT 
                 id,
                 user_id as "userId",
                 problem_id as "problemId",
                 status,
                 passed_tests as "passedTests",
                 total_tests as "totalTests",
                 runtime_ms as "runtimeMs",
                 memory_mb as "memoryMb",
                 created_at as "createdAt",
                 updated_at as "updatedAt"
               FROM submissions
               WHERE user_id = $1`;

    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (problemId) {
      sql += ` AND problem_id = $${paramIndex}`;
      params.push(problemId);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const submissions = await query<any>(this.db, this.logger, sql, params);

    return submissions;
  }

  async updateSubmissionStatus(
    submissionId: string,
    status: string,
    results: {
      passedTests?: number;
      totalTests?: number;
      runtimeMs?: number;
      memoryMb?: number;
      errorMessage?: string;
    }
  ): Promise<SubmissionStatus> {
    const result = await query<any>(
      this.db,
      this.logger,
      `UPDATE submissions
       SET status = $2,
           passed_tests = COALESCE($3, passed_tests),
           total_tests = COALESCE($4, total_tests),
           runtime_ms = COALESCE($5, runtime_ms),
           memory_mb = COALESCE($6, memory_mb),
           error_message = COALESCE($7, error_message),
           updated_at = NOW()
       WHERE id = $1
       RETURNING 
         id,
         user_id as "userId",
         problem_id as "problemId",
         status,
         passed_tests as "passedTests",
         total_tests as "totalTests",
         runtime_ms as "runtimeMs",
         memory_mb as "memoryMb",
         error_message as "errorMessage",
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [
        submissionId,
        status,
        results.passedTests,
        results.totalTests,
        results.runtimeMs,
        results.memoryMb,
        results.errorMessage,
      ]
    );

    if (!result.length) {
      throw new NotFoundError('Submission');
    }

    this.logger.info({ submissionId, status }, 'Submission status updated');

    return result[0];
  }

  async getSubmissionStats(userId: string, problemId: string): Promise<any> {
    const result = await query<any>(
      this.db,
      this.logger,
      `SELECT
         COUNT(*) as "totalSubmissions",
         COUNT(*) FILTER (WHERE status = 'accepted') as "acceptedCount",
         MIN(runtime_ms) as "bestRuntimeMs",
         MIN(memory_mb) as "bestMemoryMb"
       FROM submissions
       WHERE user_id = $1 AND problem_id = $2`,
      [userId, problemId]
    );

    if (!result.length) {
      return {
        totalSubmissions: 0,
        acceptedCount: 0,
        bestRuntimeMs: null,
        bestMemoryMb: null,
      };
    }

    return {
      totalSubmissions: parseInt(result[0].totalSubmissions),
      acceptedCount: parseInt(result[0].acceptedCount),
      bestRuntimeMs: result[0].bestRuntimeMs,
      bestMemoryMb: result[0].bestMemoryMb,
    };
  }

  async createTestResult(submissionId: string, testCaseId: string, result: any): Promise<void> {
    await query(
      this.db,
      this.logger,
      `INSERT INTO test_case_results 
       (submission_id, test_case_id, status, actual_output, expected_output, error_message, runtime_ms, memory_mb)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        submissionId,
        testCaseId,
        result.status,
        result.actualOutput,
        result.expectedOutput,
        result.errorMessage,
        result.runtimeMs,
        result.memoryMb,
      ]
    );
  }

  async getTestResults(submissionId: string): Promise<any[]> {
    const results = await query<any>(
      this.db,
      this.logger,
      `SELECT 
         id,
         test_case_id as "testCaseId",
         status,
         actual_output as "actualOutput",
         expected_output as "expectedOutput",
         error_message as "errorMessage",
         runtime_ms as "runtimeMs",
         memory_mb as "memoryMb",
         created_at as "createdAt"
       FROM test_case_results
       WHERE submission_id = $1
       ORDER BY created_at ASC`,
      [submissionId]
    );

    return results;
  }

  async getLatestAcceptedCode(userId: string, problemId: string): Promise<{ code: string; language: string } | null> {
    const result = await query<any>(
      this.db,
      this.logger,
      `SELECT code, language
       FROM submissions
       WHERE user_id = $1 AND problem_id = $2 AND status = 'accepted'
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
