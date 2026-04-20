import { Queue, Worker, QueueEvents } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';

export interface SubmissionJob {
  submissionId: string;
  userId: string;
  problemId: string;
  code: string;
  language: string;
  isRunOnly?: boolean;
}

export class SubmissionQueue {
  private queue: Queue<SubmissionJob>;
  private queueEvents: QueueEvents;

  constructor(
    redis: Redis,
    private logger: Logger
  ) {
    this.queue = new Queue('submissions', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    this.queueEvents = new QueueEvents('submissions', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.queueEvents.on('completed', (job) => {
      this.logger.info({ jobId: job.jobId }, 'Job completed');
    });

    this.queueEvents.on('failed', (job) => {
      this.logger.error({ jobId: job.jobId, failedReason: job.failedReason }, 'Job failed');
    });

    this.queueEvents.on('error', (err) => {
      this.logger.error({ err }, 'Queue error');
    });
  }

  async queueSubmission(job: SubmissionJob): Promise<string> {
    try {
      const queuedJob = await this.queue.add('judge', job, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.info(
        { jobId: queuedJob.id, submissionId: job.submissionId },
        'Submission queued for judging'
      );

      return queuedJob.id!;
    } catch (err) {
      this.logger.error({ err, submissionId: job.submissionId }, 'Failed to queue submission');
      throw err;
    }
  }

  async getQueueDepth(): Promise<number> {
    return this.queue.count();
  }

  async getQueue(): Promise<Queue<SubmissionJob>> {
    return this.queue;
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.queueEvents.close();
  }
}
