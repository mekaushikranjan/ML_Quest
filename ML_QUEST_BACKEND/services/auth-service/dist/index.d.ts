import "dotenv/config";
import { Pool } from "pg";
import { Redis } from "ioredis";
declare module "fastify" {
    interface FastifyInstance {
        db: Pool;
        redis: Redis;
    }
}
