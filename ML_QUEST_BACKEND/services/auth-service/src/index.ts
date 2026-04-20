import "dotenv/config";
import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import { Pool } from "pg";
import { Redis } from "ioredis";
import {
  ApiError,
  ApiResponse,
  AppError,
  ValidationError,
  createDbPool,
  createRedisClient,
  authPlugin,
  isAppError,
} from "@ml-quest/shared";
import { ZodError } from "zod";
import authRoutes from "./routes/auth.routes";

declare module "fastify" {
  interface FastifyInstance {
    db: Pool;
    redis: Redis;
  }
}

async function buildServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: true,
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: "all",
      },
    },
  });

  const logger = app.log;

  // Create shared resources
  const db = createDbPool(
    {
      host: process.env.DB_HOST || process.env.PGHOST || "localhost",
      port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
      user: process.env.DB_USER || process.env.PGUSER || "postgres",
      password: process.env.DB_PASSWORD || process.env.PGPASSWORD || "postgres",
      database: process.env.AUTH_DB_NAME || process.env.PGDATABASE || "postgres",
      max: 10,
    },
    logger
  );

  const redis = createRedisClient(
    {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    logger
  );

  app.decorate("db", db);
  app.decorate("redis", redis);

  // Fastify plugins
  await app.register(helmet);
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 1000,
    timeWindow: "1 minute",
  });

  await app.register(swagger, {
    swagger: {
      info: {
        title: "Auth Service API",
        version: "1.0.0",
      },
      schemes: ["http"],
      consumes: ["application/json"],
      produces: ["application/json"],
    },
  });

  // Auth plugin from shared
  await app.register(authPlugin, { logger, redis });

  // Health route
  app.get("/health", async () => {
    const response: ApiResponse<{ status: string }> = {
      data: { status: "ok" },
    };
    return response;
  });

  // Auth routes
  await app.register(authRoutes, { prefix: "/auth" });

  // Global error handler
  app.setErrorHandler(
    (error: Error, _request: FastifyRequest, reply: FastifyReply): void => {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join(".") || "root";
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(issue.message);
        }

        const validationError = new ValidationError("Invalid request payload", details);
        const body: ApiResponse<null> = {
          data: null,
          error: {
            message: validationError.message,
            code: validationError.code,
            details: validationError.details as Record<string, string[]>,
          } as ApiError,
        };

        void reply.status(validationError.statusCode).send(body);
        return;
      }

      if (isAppError(error)) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            message: error.message,
            code: error.code,
            details: (error as any).details as Record<string, string[]> | undefined,
          } as ApiError,
        };

        void reply.status(error.statusCode).send(body);
        return;
      }

      // Fallback 500
      const body: ApiResponse<null> = {
        data: null,
        error: {
          message: "Internal Server Error",
          code: "INTERNAL_ERROR",
        },
      };

      app.log.error({ err: error }, "Unhandled error");
      void reply.status(500).send(body);
    }
  );

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    const body: ApiResponse<null> = {
      data: null,
      error: {
        message: `Route ${request.method} ${request.url} not found`,
        code: "NOT_FOUND",
      },
    };
    void reply.status(404).send(body);
  });

  // Graceful shutdown
  app.addHook("onClose", async () => {
    await Promise.all([db.end(), redis.quit()]);
  });

  return app;
}

async function start() {
  const app = await buildServer();
  const port = Number(process.env.PORT || 3001);

  try {
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`Auth service listening on port ${port}`);
  } catch (err) {
    app.log.error({ err }, "Failed to start auth service");
    process.exit(1);
  }

  const shutdown = async () => {
    try {
      await app.close();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

void start();

