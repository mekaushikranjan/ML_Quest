import 'dotenv/config';
// env loaded
import dns from 'node:dns';

// Force IPv4 lookup to prevent AWS SDK from timing out on IPv6 DNS resolution
dns.setDefaultResultOrder('ipv4first');
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createLogger, createRedisClient, createDbPool, isAppError, authPlugin } from '@ml-quest/shared';
import { ZodError } from 'zod';
import { problemsRoutes } from './routes/problems.routes';
import { testCasesRoutes } from './routes/testcases.routes';

const logger = createLogger('problems-service');

const buildApp = async () => {
  const app = Fastify({
    logger: false,
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        allErrors: true,
      },
    },
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const redis = createRedisClient(
    {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      keyPrefix: 'problems:',
    },
    logger
  );

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    redis,
  });

  const db = createDbPool(
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.PROBLEMS_DB_NAME || 'ml_quest_problems',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      maxConnections: 5,
    },
    logger
  );

  app.decorate('db', db);
  app.decorate('redis', redis);
  app.decorate('logger', logger);

  // Register auth plugin
  await app.register(authPlugin, { logger, redis });

  await app.register(problemsRoutes, { prefix: '/problems' });
  await app.register(testCasesRoutes, { prefix: '/problems' });

  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request data' },
      });
    }

    if (error instanceof ZodError) {
      const messages = error.issues.map(i => i.message).join(', ');
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: messages },
      });
    }

    if (isAppError(error)) {
      return reply.status(error.statusCode).send({
        success: false,
        error: { code: error.code, message: error.message },
      });
    }

    logger.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  return app;
};

const start = async () => {
  const app = await buildApp();
  const port = parseInt(process.env.PORT || '3002');

  try {
    await app.listen({ port, host: '0.0.0.0' });
    logger.info({ port }, '🚀 Problems service started');
  } catch (err) {
    logger.fatal({ err }, 'Failed to start problems service');
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start();
