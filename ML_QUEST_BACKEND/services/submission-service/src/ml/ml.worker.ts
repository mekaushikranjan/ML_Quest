import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
import 'dotenv/config';

import { Worker, type Job } from 'bullmq';
import { createLogger, createRedisClient, createDbPool } from '@ml-quest/shared';
import { MLSubmissionService } from './ml-submission.service';
import type { MLSubmissionJobData } from './types';

const logger = createLogger('ml-worker');

const startMLWorker = async () => {
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

        const mlService = new MLSubmissionService(db, redis as any, logger as any);

        const worker = new Worker<MLSubmissionJobData>(
            'ml-submissions',
            async (job: Job<MLSubmissionJobData>) => {
                logger.info(
                    { jobId: job.id, mlSubmissionId: job.data.mlSubmissionId },
                    '[ML Worker] Processing ML submission'
                );

                await mlService.processMLSubmission(job.data);

                return { success: true, mlSubmissionId: job.data.mlSubmissionId };
            },
            {
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                },
                concurrency: parseInt(process.env.ML_WORKER_CONCURRENCY || '1'),
            } as any
        );

        worker.on('completed', (job) => {
            logger.info({ jobId: job.id }, '[ML Worker] Job completed');
        });

        worker.on('failed', (job, err) => {
            logger.error({ jobId: job?.id, err }, '[ML Worker] Job failed');
        });

        worker.on('error', (err) => {
            logger.error({ err }, '[ML Worker] Worker error');
        });

        logger.info('✅ ML Judge Worker started');

        const shutdown = async (signal: string) => {
            logger.info({ signal }, '[ML Worker] Shutting down...');
            await worker.close();
            await redis.quit();
            await db.end();
            process.exit(0);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    } catch (err) {
        logger.fatal({ err }, '[ML Worker] Failed to start');
        process.exit(1);
    }
};

startMLWorker();
