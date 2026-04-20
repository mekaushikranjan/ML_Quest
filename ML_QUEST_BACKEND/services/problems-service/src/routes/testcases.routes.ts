import { FastifyInstance } from 'fastify';
import { TestCasesService } from '../services/testcases.service';
import { AddTestCasesSchema } from '../validators/testcases.validators';
import { ForbiddenError } from '@ml-quest/shared';

export const testCasesRoutes = async (app: FastifyInstance) => {
  const service = new TestCasesService(app.db as any, app.logger as any);

  const requireEditor = async (request: any, reply: any) => {
    await app.authenticate(request, reply);
    const role = request.user?.role;
    if (role !== 'admin' && role !== 'editor') {
      throw new ForbiddenError('Insufficient permissions');
    }
  };

  // POST /problems/:problemId/test-cases
  // Add test cases to a problem
  app.post('/:problemId/test-cases', {
    preHandler: [requireEditor],
    handler: async (request, reply) => {
      const { problemId } = request.params as { problemId: string };
      const body = AddTestCasesSchema.parse(request.body);
      const result = await service.addTestCases(problemId, body.testCases);
      reply.status(201).send({ success: true, data: result });
    },
  });

  // GET /problems/:problemId/test-cases
  // Get sample test cases (visible to users)
  app.get('/:problemId/test-cases', {
    preHandler: [app.optionalAuth],
    handler: async (request, reply) => {
      const { problemId } = request.params as { problemId: string };
      const query = request.query as { includeHidden?: string };
      let includeHidden = query.includeHidden === 'true';

      if (includeHidden) {
        // Only admin/editor can see hidden test cases
        const role = (request.user as any)?.role;
        if (!request.user || !['admin', 'editor'].includes(role)) {
          includeHidden = false; // Silently downgrade for safety
        }
      }

      const result = await service.getTestCases(problemId, includeHidden);
      reply.send({ success: true, data: result });
    },
  });

  // GET /problems/:problemId/test-cases/count
  // Get test case counts (total, sample, hidden)
  app.get('/:problemId/test-cases/count', {
    handler: async (request, reply) => {
      const { problemId } = request.params as { problemId: string };
      const result = await service.getTestCaseCount(problemId);
      reply.send({ success: true, data: result });
    },
  });

  // GET /problems/:problemId/test-cases/:testCaseId/content
  // Get input/output content from S3 for a sample test case (for display)
  app.get('/:problemId/test-cases/:testCaseId/content', {
    handler: async (request, reply) => {
      const { problemId, testCaseId } = request.params as { problemId: string; testCaseId: string };
      const result = await service.getTestCaseContent(problemId, testCaseId);
      reply.send({ success: true, data: result });
    },
  });

  // DELETE /problems/:problemId/test-cases/:testCaseId
  app.delete('/:problemId/test-cases/:testCaseId', {
    preHandler: [requireEditor],
    handler: async (request, reply) => {
      const { problemId, testCaseId } = request.params as {
        problemId: string;
        testCaseId: string;
      };
      const result = await service.deleteTestCase(problemId, testCaseId);
      reply.send({ success: true, data: result });
    },
  });
};
