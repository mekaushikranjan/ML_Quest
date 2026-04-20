import { FastifyInstance } from 'fastify';
import { ProblemsController } from '../controllers/problems.controller';
import { CreateProblemSchema, ProblemFiltersSchema } from '../validators/problems.validators';
import { ForbiddenError } from '@ml-quest/shared';

export const problemsRoutes = async (app: FastifyInstance) => {
  const controller = new ProblemsController(app);

  const requireEditor = async (request: any, reply: any) => {
    await app.authenticate(request, reply);
    const role = request.user?.role;
    if (role !== 'admin' && role !== 'editor') {
      throw new ForbiddenError('Insufficient permissions');
    }
  };

  // GET /problems?difficulty=easy&tags=array,string&search=two+sum&page=1&limit=20
  app.get('/', {
    handler: async (request, reply) => {
      const filters = ProblemFiltersSchema.parse(request.query);
      const result = await controller.getList(filters);
      reply.send({ success: true, data: result });
    },
  });

  // GET /problems/:slug
  app.get('/:slug', {
    handler: async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const result = await controller.getBySlug(slug);
      reply.send({ success: true, data: result });
    },
  });

  // POST /problems — create new problem
  app.post('/', {
    preHandler: [requireEditor],
    handler: async (request, reply) => {
      const dto = CreateProblemSchema.parse(request.body);
      const result = await controller.create(dto);
      reply.status(201).send({ success: true, data: result });
    },
  });

  // DELETE /problems/:problemId — admin/editor only
  app.delete('/:problemId', {
    preHandler: [requireEditor],
    handler: async (request, reply) => {
      const { problemId } = request.params as { problemId: string };
      const result = await controller.delete(problemId);
      reply.send({ success: true, data: result });
    },
  });
};
