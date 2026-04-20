import { FastifyInstance } from 'fastify';
import { SubmissionService } from '../services/submission.service';
import { SSEService } from '../services/sse.service';
import { SubmitCodeSchema, GetSubmissionsSchema } from '../validators/submission.validators';

export const submissionRoutes = async (app: FastifyInstance) => {
  const service = new SubmissionService((app as any).db, (app as any).redis, (app as any).logger);
  const sseService = new SSEService((app as any).redis, (app as any).logger);

  // ─── POST /submissions ─────────────────────────────────────
  app.post('/', {
    preHandler: (app as any).authenticate,
    handler: async (request, reply) => {
      const body = SubmitCodeSchema.parse(request.body);
      const userId = (request as any).user.userId;

      const submission = await service.createSubmission({
        userId,
        problemId: body.problemId,
        code: body.code,
        language: body.language,
        isRunOnly: body.isRunOnly,
      });

      const queueDepth = await service.getQueueDepth();

      reply.status(202).send({
        success: true,
        data: { ...submission, queueDepth },
      });
    },
  });

  // ─── GET /submissions/:submissionId/stream ─────────────────
  app.get('/:submissionId/stream', {
    preHandler: (app as any).authenticate,
    handler: async (request, reply) => {
      const { submissionId } = request.params as { submissionId: string };
      const userId = (request as any).user.userId;

      const submission = await service.getSubmission(submissionId);
      if (submission.userId !== userId) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        });
      }

      const terminalStatuses = [
        'accepted', 'wrong_answer', 'runtime_error',
        'time_limit_exceeded', 'compilation_error',
      ];

      if (terminalStatuses.includes(submission.status)) {
        return reply.send({ success: true, data: submission });
      }

      reply.header('Content-Type', 'text/event-stream');
      reply.header('Cache-Control', 'no-cache');
      reply.header('Connection', 'keep-alive');
      reply.header('X-Accel-Buffering', 'no');

      // Add explicit CORS headers just in case fastify-cors bypasses due to raw usage
      const origin = request.headers.origin || '*';
      reply.raw.setHeader('Access-Control-Allow-Origin', origin);
      reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
      reply.raw.flushHeaders();

      reply.raw.write(
        `data: ${JSON.stringify({ status: submission.status })}\n\n`
      );

      const cleanup = await sseService.streamSubmissionResult(
        submissionId,
        (data) => {
          reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
        },
        () => {
          reply.raw.end();
        }
      );

      request.raw.on('close', () => {
        cleanup();
      });
    },
  });

  // ─── GET /submissions/:submissionId ────────────────────────
  app.get('/:submissionId', {
    preHandler: (app as any).authenticate,
    handler: async (request, reply) => {
      const { submissionId } = request.params as { submissionId: string };
      const userId = (request as any).user.userId;

      const submission = await service.getSubmission(submissionId);

      if (submission.userId !== userId) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        });
      }

      reply.send({ success: true, data: submission });
    },
  });

  // ─── GET /submissions/:submissionId/details ────────────────
  app.get('/:submissionId/details', {
    preHandler: (app as any).authenticate,
    handler: async (request, reply) => {
      const { submissionId } = request.params as { submissionId: string };
      const userId = (request as any).user.userId;

      const submission = await service.getSubmissionWithCode(submissionId);

      if (submission.userId !== userId) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' },
        });
      }

      const testResults = await service.getTestResults(submissionId);

      reply.send({
        success: true,
        data: { ...submission, testResults },
      });
    },
  });

  // ─── GET /submissions ──────────────────────────────────────
  app.get('/', {
    preHandler: (app as any).authenticate,
    handler: async (request, reply) => {
      const filters = GetSubmissionsSchema.parse(request.query);
      const userId = (request as any).user.userId;

      const submissions = await service.getUserSubmissions(
        userId,
        filters.problemId,
        filters.limit,
        filters.offset
      );

      reply.send({ success: true, data: submissions });
    },
  });

  // ─── GET /submissions/:problemId/stats ─────────────────────
  app.get('/:problemId/stats', {
    preHandler: (app as any).authenticate,
    handler: async (request, reply) => {
      const { problemId } = request.params as { problemId: string };
      const userId = (request as any).user.userId;

      const stats = await service.getSubmissionStats(userId, problemId);
      reply.send({ success: true, data: stats });
    },
  });
  // ─── GET /submissions/:problemId/latest ────────────────────
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