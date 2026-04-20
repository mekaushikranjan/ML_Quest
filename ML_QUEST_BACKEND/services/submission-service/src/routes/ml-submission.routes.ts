import { FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import { MLSubmissionService } from '../ml/ml-submission.service';
import { MLSubmitCodeSchema, GetMLSubmissionsSchema } from '../validators/ml-submission.validators';

const ML_TERMINAL_STATUSES = ['completed', 'failed', 'timeout', 'runtime_error'];

export const mlSubmissionRoutes = async (app: FastifyInstance) => {
    const service = new MLSubmissionService(
        (app as any).db,
        (app as any).redis,
        (app as any).logger
    );

    // ─── GET /ml-submissions/supported-types ──────────────────────────────────
    // Public – no auth needed, useful for frontend to display task type options
    app.get('/supported-types', {
        handler: async (_request, reply) => {
            reply.send({ success: true, data: service.getSupportedTaskTypes() });
        },
    });

    // ─── POST /ml-submissions ─────────────────────────────────────────────────
    app.post('/', {
        preHandler: (app as any).authenticate,
        handler: async (request, reply) => {
            const body = MLSubmitCodeSchema.parse(request.body);
            const userId = (request as any).user.userId;

            try {
                const submission = await service.createMLSubmission({
                    userId,
                    code: body.code,
                    problemId: body.problemId,
                    taskTypeHint: body.taskTypeHint,
                });

                const queueDepth = await service.getQueueDepth();

                reply.status(202).send({
                    success: true,
                    data: { ...submission, queueDepth },
                });
            } catch (err: any) {
                if (err.message?.includes('Too many ML submissions')) {
                    return reply.status(429).send({
                        success: false,
                        error: { code: 'RATE_LIMITED', message: err.message },
                    });
                }
                throw err;
            }
        },
    });

    // ─── GET /ml-submissions ──────────────────────────────────────────────────
    app.get('/', {
        preHandler: (app as any).authenticate,
        handler: async (request, reply) => {
            const filters = GetMLSubmissionsSchema.parse(request.query);
            const userId = (request as any).user.userId;

            const submissions = await service.getUserMLSubmissions(
                userId,
                filters.limit,
                filters.offset
            );

            reply.send({ success: true, data: submissions });
        },
    });

    // ─── GET /ml-submissions/:id ──────────────────────────────────────────────
    app.get('/:id', {
        preHandler: (app as any).authenticate,
        handler: async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = (request as any).user.userId;
            const submission = await service.getMLSubmission(id);

            if (submission.userId !== userId) {
                return reply.status(403).send({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' },
                });
            }

            reply.send({ success: true, data: submission });
        },
    });

    // ─── GET /ml-submissions/:id/results ─────────────────────────────────────
    app.get('/:id/results', {
        preHandler: (app as any).authenticate,
        handler: async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = (request as any).user.userId;

            const submission = await service.getMLSubmission(id);
            if (submission.userId !== userId) {
                return reply.status(403).send({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' },
                });
            }

            if (submission.status !== 'completed') {
                return reply.status(202).send({
                    success: false,
                    error: { code: 'NOT_READY', message: `Submission is ${submission.status}` },
                });
            }

            const result = await service.getMLResult(id);
            if (!result) {
                return reply.status(404).send({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Result not yet available' },
                });
            }

            reply.send({ success: true, data: result });
        },
    });

    // ─── GET /ml-submissions/:id/stream ──────────────────────────────────────
    // SSE endpoint – streams real-time status updates via Redis pub/sub
    app.get('/:id/stream', {
        preHandler: (app as any).authenticate,
        handler: async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = (request as any).user.userId;

            const submission = await service.getMLSubmission(id);
            if (submission.userId !== userId) {
                return reply.status(403).send({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Access denied' },
                });
            }

            // Already finished – return immediately
            if (ML_TERMINAL_STATUSES.includes(submission.status)) {
                return reply.send({ success: true, data: submission });
            }

            // SSE headers
            reply.header('Content-Type', 'text/event-stream');
            reply.header('Cache-Control', 'no-cache');
            reply.header('Connection', 'keep-alive');
            reply.header('X-Accel-Buffering', 'no');

            const origin = request.headers.origin || '*';
            reply.raw.setHeader('Access-Control-Allow-Origin', origin);
            reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
            reply.raw.flushHeaders();

            // Send current status immediately
            reply.raw.write(`data: ${JSON.stringify({ status: submission.status })}\n\n`);

            // Subscribe to Redis channel for this submission
            const subscriber = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            });

            await subscriber.subscribe(`ml_submission:${id}`);

            const onMessage = (_channel: string, message: string) => {
                try {
                    const data = JSON.parse(message);
                    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
                    if (ML_TERMINAL_STATUSES.includes(data.status)) {
                        cleanup();
                    }
                } catch {
                    // ignore parse error
                }
            };

            subscriber.on('message', onMessage);

            const cleanup = () => {
                subscriber.unsubscribe(`ml_submission:${id}`).catch(() => { });
                subscriber.quit().catch(() => { });
                reply.raw.end();
            };

            request.raw.on('close', cleanup);

            // Auto-close after 5 min to prevent zombie connections
            const autoClose = setTimeout(cleanup, 5 * 60 * 1000);
            request.raw.on('close', () => clearTimeout(autoClose));
        },
    });

    // ─── GET /ml-submissions/:problemId/latest ───────────────────────────────
    app.get('/:problemId/latest', {
        preHandler: (app as any).authenticate,
        handler: async (request, reply) => {
            const { problemId } = request.params as { problemId: string };
            const userId = (request as any).user.userId;

            const latest = await service.getLatestAcceptedCode(userId, problemId);
            reply.send({ success: true, data: latest });
        },
    });
};
