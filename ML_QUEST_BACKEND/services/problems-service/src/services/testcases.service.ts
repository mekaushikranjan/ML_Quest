import { Pool } from 'pg';
import { query } from '@ml-quest/shared';
import { NotFoundError } from '@ml-quest/shared';
import type { Logger } from '@ml-quest/shared';
import { S3Service } from './s3.service';
import { randomUUID } from 'crypto';

export interface TestCaseDto {
  input: string;
  output: string;
  isSample?: boolean;
}

export class TestCasesService {
  private s3Service: S3Service;

  constructor(
    private db: Pool,
    private logger: Logger
  ) {
    this.s3Service = new S3Service(logger);
  }

  async addTestCases(problemId: string, testCases: TestCaseDto[]) {
    // Verify problem exists
    const problems = await query(
      this.db,
      this.logger,
      'SELECT id FROM problems WHERE id = $1',
      [problemId]
    );

    if (!problems.length) throw new NotFoundError('Problem');

    // Insert all test cases in one query
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const tc of testCases) {
      const testCaseId = randomUUID();
      
      // Upload to S3
      await this.s3Service.uploadTestCase(problemId, testCaseId, 'input', tc.input);
      await this.s3Service.uploadTestCase(problemId, testCaseId, 'output', tc.output);

      // Store S3 keys and metadata in database
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
      );
      values.push(
        testCaseId,
        problemId,
        `test-cases/${problemId}/${testCaseId}/input.txt`,
        `test-cases/${problemId}/${testCaseId}/output.txt`,
        tc.isSample ?? false
      );
    }

    const inserted = await query(
      this.db,
      this.logger,
      `INSERT INTO test_cases (id, problem_id, s3_input_key, s3_output_key, is_sample)
       VALUES ${placeholders.join(', ')}
       RETURNING id, problem_id, is_sample, created_at`,
      values
    );

    this.logger.info(
      { problemId, count: inserted.length },
      'Test cases added to S3 and database'
    );

    return inserted;
  }

  async getTestCases(problemId: string, includeHidden = false) {
    // Verify problem exists
    const problems = await query(
      this.db,
      this.logger,
      'SELECT id FROM problems WHERE id = $1',
      [problemId]
    );

    if (!problems.length) throw new NotFoundError('Problem');

    const conditions = ['problem_id = $1'];
    const params: unknown[] = [problemId];

    // If includeHidden is false, only return sample test cases
    // Hidden test cases are only used by judge worker
    if (!includeHidden) {
      conditions.push('is_sample = true');
    }

    const testCases = await query(
      this.db,
      this.logger,
      `SELECT id, problem_id, s3_input_key, s3_output_key, is_sample, created_at
       FROM test_cases
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at ASC`,
      params
    );

    // Add presigned URLs for test case data
    const testCasesWithUrls = await Promise.all(
      testCases.map(async (tc: any) => ({
        ...tc,
        inputUrl: await this.s3Service.getPreSignedUrl(tc.s3_input_key),
        outputUrl: await this.s3Service.getPreSignedUrl(tc.s3_output_key),
      }))
    );

    return testCasesWithUrls;
  }

  async deleteTestCase(problemId: string, testCaseId: string) {
    const result = await query(
      this.db,
      this.logger,
      `DELETE FROM test_cases
       WHERE id = $1 AND problem_id = $2
       RETURNING id`,
      [testCaseId, problemId]
    );

    if (!result.length) throw new NotFoundError('Test case');

    // Delete from S3
    await this.s3Service.deleteTestCase(problemId, testCaseId);

    this.logger.info({ testCaseId, problemId }, 'Test case deleted from S3 and database');
    return { deleted: true };
  }

  async getTestCaseCount(problemId: string) {
    const result = await query<{ total: string; sample: string }>(
      this.db,
      this.logger,
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_sample = true) as sample
       FROM test_cases
       WHERE problem_id = $1`,
      [problemId]
    );

    return {
      total: parseInt(result[0].total),
      sample: parseInt(result[0].sample),
      hidden: parseInt(result[0].total) - parseInt(result[0].sample),
    };
  }

  /** Get input/output content from S3 for a sample test case (for display to user). */
  async getTestCaseContent(problemId: string, testCaseId: string): Promise<{ input: string; output: string }> {
    const rows = await query<any>(
      this.db,
      this.logger,
      `SELECT s3_input_key, s3_output_key FROM test_cases
       WHERE id = $1 AND problem_id = $2 AND is_sample = true`,
      [testCaseId, problemId]
    );
    if (!rows.length) throw new NotFoundError('Test case');
    const input = await this.s3Service.getTestCase(rows[0].s3_input_key);
    const output = await this.s3Service.getTestCase(rows[0].s3_output_key);
    return { input: input || '', output: (output || '').trim() };
  }
}

