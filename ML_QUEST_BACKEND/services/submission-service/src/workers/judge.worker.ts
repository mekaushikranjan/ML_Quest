import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
import 'dotenv/config';
import { Worker, type Job } from 'bullmq';
import { createLogger, createRedisClient, createDbPool } from '@ml-quest/shared';
import { JudgeService } from '../services/judge.service';
import type { SubmissionJobData } from '../services/submission.service';

const logger = createLogger('judge-worker');

const startWorker = async () => {
  try {
    const redis = createRedisClient(
      {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      logger
    );

    const db = createDbPool(
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.SUBMISSION_DB_NAME || 'ml_quest_submissions',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      },
      logger
    );

    const judgeService = new JudgeService(db, redis as any, logger as any);

    // Create BullMQ worker
    const worker = new Worker('submissions', async (job: Job<SubmissionJobData, any>) => {
      const { submissionId, problemId, code, language, isRunOnly } = job.data;

      logger.info(
        { submissionId, problemId, language, jobId: job.id },
        'Processing submission'
      );

      try {
        await judgeService.judgeSubmission(submissionId, problemId, code, language, isRunOnly);

        return {
          success: true,
          submissionId,
        };
      } catch (err) {
        logger.error({ err, submissionId }, 'Job processing failed');
        throw err;
      }
    }, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
    } as any);

    // Event listeners
    worker.on('completed', (job) => {
      logger.info({ jobId: job.id, submissionId: job.data.submissionId }, 'Job completed');
    });

    worker.on('failed', (job, err) => {
      logger.error(
        { jobId: job?.id, submissionId: job?.data.submissionId, err },
        'Job failed'
      );
    });

    worker.on('error', (err) => {
      logger.error({ err }, 'Worker error');
    });

    logger.info('✅ Judge worker started');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down judge worker...');
      await worker.close();
      await redis.quit();
      await db.end();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.fatal({ err }, 'Failed to start judge worker');
    process.exit(1);
  }
};

startWorker();
