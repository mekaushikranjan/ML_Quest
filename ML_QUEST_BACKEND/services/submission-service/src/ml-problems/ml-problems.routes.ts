import { FastifyInstance } from 'fastify';
import { ML_PROBLEMS, MLProblem } from './ml-problems.data';
import { MLTaskType } from '../ml/types';

export const mlProblemsRoutes = async (app: FastifyInstance) => {
    // ─── GET /ml-problems ──────────────────────────────────────────────────────
    // Public — lists all ML practice problems with optional filters
    app.get('/', {
        handler: async (request, reply) => {
            const { taskType, difficulty, search } = request.query as {
                taskType?: MLTaskType;
                difficulty?: 'easy' | 'medium' | 'hard';
                search?: string;
            };

            let problems: MLProblem[] = ML_PROBLEMS;

            if (taskType) {
                problems = problems.filter((p) => p.taskType === taskType);
            }

            if (difficulty) {
                problems = problems.filter((p) => p.difficulty === difficulty);
            }

            if (search) {
                const q = search.toLowerCase();
                problems = problems.filter(
                    (p) =>
                        p.title.toLowerCase().includes(q) ||
                        p.description.toLowerCase().includes(q) ||
                        p.tags.some((t) => t.includes(q))
                );
            }

            // Strip heavy fields for list view
            const list = problems.map(({ starterCode: _s, hints: _h, evaluationCriteria: _e, ...rest }) => rest);

            reply.send({ success: true, data: { problems: list, total: list.length } });
        },
    });

    // ─── GET /ml-problems/task-types ───────────────────────────────────────────
    // Public — returns enumeration of available ML task types for filter UI
    app.get('/task-types', {
        handler: async (_request, reply) => {
            const types = Object.values(MLTaskType);
            reply.send({ success: true, data: types });
        },
    });

    // ─── GET /ml-problems/:id ──────────────────────────────────────────────────
    // Public — returns full problem detail including starterCode and hints
    app.get('/:id', {
        handler: async (request, reply) => {
            const { id } = request.params as { id: string };

            // Support both numeric slugs like "ml-001" and full slugs like "iris-flower-classifier"
            const problem = ML_PROBLEMS.find((p) => p.id === id || p.slug === id);

            if (!problem) {
                return reply.status(404).send({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'ML problem not found' },
                });
            }

            reply.send({ success: true, data: problem });
        },
    });
};
