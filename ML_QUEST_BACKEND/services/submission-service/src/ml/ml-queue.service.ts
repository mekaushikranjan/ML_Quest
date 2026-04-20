import { Queue, QueueEvents } from 'bullmq';
import type { Logger } from 'pino';
import type { MLSubmissionJobData } from './types';

const QUEUE_NAME = 'ml-submissions';

export class MLQueue {
    private queue: Queue<MLSubmissionJobData>;
    private queueEvents: QueueEvents;

    constructor(private readonly logger: Logger) {
        const connection = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
        };

        this.queue = new Queue<MLSubmissionJobData>(QUEUE_NAME, { connection });
        this.queueEvents = new QueueEvents(QUEUE_NAME, { connection });

        this.queueEvents.on('completed', (job) => {
            this.logger.info({ jobId: job.jobId }, '[ML Queue] Job completed');
        });
        this.queueEvents.on('failed', (job) => {
            this.logger.error({ jobId: job.jobId, reason: job.failedReason }, '[ML Queue] Job failed');
        });
        this.queueEvents.on('error', (err) => {
            this.logger.error({ err }, '[ML Queue] Queue error');
        });
    }

    async enqueue(jobData: MLSubmissionJobData): Promise<string> {
        const job = await this.queue.add('ml-judge', jobData, {
            attempts: 2,
            backoff: { type: 'exponential', delay: 3000 },
            removeOnComplete: true,
            removeOnFail: false,
        });

        this.logger.info(
            { jobId: job.id, mlSubmissionId: jobData.mlSubmissionId },
            '[ML Queue] ML submission enqueued'
        );

        return job.id!;
    }

    async getDepth(): Promise<number> {
        return this.queue.count();
    }

    async close(): Promise<void> {
        await this.queue.close();
        await this.queueEvents.close();
    }
}
