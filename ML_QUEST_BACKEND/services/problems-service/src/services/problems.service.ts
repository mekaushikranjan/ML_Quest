import { Pool } from 'pg';
import Redis from 'ioredis';
import { query, withTransaction } from '@ml-quest/shared';
import { NotFoundError, ConflictError } from '@ml-quest/shared';
import type { Logger } from '@ml-quest/shared';
import type { CreateProblemDto, ProblemFiltersDto } from '../validators/problems.validators';
import crypto from 'crypto';

export class ProblemsService {
  constructor(
    private db: Pool,
    private redis: Redis,
    private logger: Logger
  ) { }

  async getList(filters: ProblemFiltersDto) {
    const filterHash = crypto
      .createHash('md5')
      .update(JSON.stringify(filters))
      .digest('hex');
    const cacheKey = `problems:list:${filterHash}`;

    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey }, 'Problems list cache hit');
      return JSON.parse(cached);
    }

    // Build query dynamically
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.difficulty) {
      conditions.push(`difficulty = $${paramIndex++}`);
      params.push(filters.difficulty);
    }

    if (filters.tags) {
      const tagsArray = filters.tags.split(',').map(t => t.trim());
      conditions.push(`tags && $${paramIndex++}`);
      params.push(tagsArray);
    }

    if (filters.search) {
      conditions.push(
        `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    // Get total count
    const countResult = await query<{ count: string }>(
      this.db,
      this.logger,
      `SELECT COUNT(*) as count FROM problems ${where}`,
      params
    );
    const total = parseInt(countResult[0].count);

    // Get paginated results
    const problems = await query(
      this.db,
      this.logger,
      `SELECT id, slug, title, difficulty, tags, acceptance_rate, is_premium, created_at
       FROM problems
       ${where}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, filters.limit, offset]
    );

    const result = {
      problems,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(result));

    return result;
  }

  async getBySlug(slug: string) {
    const cacheKey = `problems:slug:${slug}`;

    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug({ slug }, 'Problem cache hit');
      return JSON.parse(cached);
    }

    const problems = await query(
      this.db,
      this.logger,
      `SELECT id, slug, title, description, difficulty, tags,
              constraints, examples, acceptance_rate, is_premium, created_at
       FROM problems WHERE slug = $1`,
      [slug]
    );

    if (!problems.length) throw new NotFoundError('Problem');

    const problem = problems[0];

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(problem));

    return problem;
  }

  async create(dto: CreateProblemDto) {
    // Check slug not taken
    const existing = await query(
      this.db,
      this.logger,
      'SELECT id FROM problems WHERE slug = $1',
      [dto.slug]
    );

    if (existing.length) throw new ConflictError('Problem with this slug already exists');

    const problems = await query(
      this.db,
      this.logger,
      `INSERT INTO problems (slug, title, description, difficulty, tags, constraints, examples, is_premium)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        dto.slug,
        dto.title,
        dto.description,
        dto.difficulty,
        dto.tags,
        dto.constraints || null,
        JSON.stringify(dto.examples),
        dto.isPremium,
      ]
    );

    // Invalidate list cache
    await this.invalidateListCache();

    this.logger.info({ slug: dto.slug }, 'Problem created');
    return problems[0];
  }

  async updateAcceptanceRate(problemId: string, rate: number) {
    await query(
      this.db,
      this.logger,
      'UPDATE problems SET acceptance_rate = $1 WHERE id = $2',
      [rate, problemId]
    );
  }

  async delete(problemId: string) {
    const result = await query(
      this.db,
      this.logger,
      'DELETE FROM problems WHERE id = $1 RETURNING id, slug',
      [problemId]
    );
    if (!result.length) throw new NotFoundError('Problem');
    // Invalidate caches
    await this.redis.del(`problems:slug:${(result[0] as any).slug}`);
    await this.invalidateListCache();
    this.logger.info({ problemId }, 'Problem deleted');
    return { deleted: true, id: problemId };
  }

  private async invalidateListCache() {
    const keys = await this.redis.keys('problems:list:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
