import { FastifyInstance } from 'fastify';
import { ProblemsService } from '../services/problems.service';
import type { CreateProblemDto, ProblemFiltersDto } from '../validators/problems.validators';

export class ProblemsController {
  private problemsService: ProblemsService;

  constructor(app: FastifyInstance) {
    this.problemsService = new ProblemsService(
      app.db,
      app.redis,
      app.logger as any
    );
  }

  async getList(filters: ProblemFiltersDto) {
    return this.problemsService.getList(filters);
  }

  async getBySlug(slug: string) {
    return this.problemsService.getBySlug(slug);
  }

  async create(dto: CreateProblemDto) {
    return this.problemsService.create(dto);
  }

  async delete(problemId: string) {
    return this.problemsService.delete(problemId);
  }
}
