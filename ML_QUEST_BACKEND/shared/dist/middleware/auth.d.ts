import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { AuthTokens, JwtPayload, User } from "../types";
import type { Logger } from "pino";
import type { Redis } from "ioredis";
declare module "fastify" {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        requirePremium: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
    interface FastifyRequest {
        user?: JwtPayload;
        issueTokens: (user: User) => Promise<AuthTokens>;
    }
}
export declare function signAccessToken(payload: JwtPayload): string;
export declare function signRefreshToken(): string;
export declare function verifyAccessToken(token: string): JwtPayload;
declare function requirePremium(request: FastifyRequest, _reply: FastifyReply): Promise<void>;
interface AuthPluginOptions {
    logger: Logger;
    redis: Redis;
}
export declare const authPlugin: FastifyPluginAsync<AuthPluginOptions>;
export { requirePremium };
