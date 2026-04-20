"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const shared_1 = require("@ml-quest/shared");
const zod_1 = require("zod");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
async function buildServer() {
    const app = (0, fastify_1.default)({
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
    const db = (0, shared_1.createDbPool)({
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "postgres",
        database: process.env.PGDATABASE || "postgres",
        max: 10,
    }, logger);
    const redis = (0, shared_1.createRedisClient)({
        url: process.env.REDIS_URL,
    }, logger);
    app.decorate("db", db);
    app.decorate("redis", redis);
    // Fastify plugins
    await app.register(helmet_1.default);
    await app.register(cors_1.default, {
        origin: true,
        credentials: true,
    });
    await app.register(rate_limit_1.default, {
        max: 1000,
        timeWindow: "1 minute",
    });
    await app.register(swagger_1.default, {
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
    await app.register(shared_1.authPlugin, { logger, redis });
    // Health route
    app.get("/health", async () => {
        const response = {
            data: { status: "ok" },
        };
        return response;
    });
    // Auth routes
    await app.register(auth_routes_1.default, { prefix: "/auth" });
    // Global error handler
    app.setErrorHandler((error, _request, reply) => {
        if (error instanceof zod_1.ZodError) {
            const details = {};
            for (const issue of error.issues) {
                const path = issue.path.join(".") || "root";
                if (!details[path]) {
                    details[path] = [];
                }
                details[path].push(issue.message);
            }
            const validationError = new shared_1.ValidationError("Invalid request payload", details);
            const body = {
                data: null,
                error: {
                    message: validationError.message,
                    code: validationError.code,
                    details: validationError.details,
                },
            };
            void reply.status(validationError.statusCode).send(body);
            return;
        }
        if ((0, shared_1.isAppError)(error)) {
            const body = {
                data: null,
                error: {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                },
            };
            void reply.status(error.statusCode).send(body);
            return;
        }
        // Fallback 500
        const body = {
            data: null,
            error: {
                message: "Internal Server Error",
                code: "INTERNAL_ERROR",
            },
        };
        app.log.error({ err: error }, "Unhandled error");
        void reply.status(500).send(body);
    });
    // 404 handler
    app.setNotFoundHandler((request, reply) => {
        const body = {
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
    }
    catch (err) {
        app.log.error({ err }, "Failed to start auth service");
        process.exit(1);
    }
    const shutdown = async () => {
        try {
            await app.close();
            process.exit(0);
        }
        catch {
            process.exit(1);
        }
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}
void start();
//# sourceMappingURL=index.js.map