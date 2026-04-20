import fp from "fastify-plugin";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { AuthTokens, JwtPayload, User } from "../types";
import type { Logger } from "pino";
import type { Redis } from "ioredis";
import { UnauthorizedError, ForbiddenError } from "../errors";
import { RedisKeys, RedisTTL } from "../utils/redis";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (roles: ("admin" | "editor" | "user")[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePremium: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user?: JwtPayload;
    issueTokens: (user: User) => Promise<AuthTokens>;
  }
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_SECONDS = RedisTTL.REFRESH_TOKEN;

export function signAccessToken(payload: JwtPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not configured");
  }

  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}

export function signRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not configured");
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (err) {
    throw new UnauthorizedError("Invalid or expired access token");
  }
}

async function requirePremium(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.user) {
    throw new UnauthorizedError();
  }

  if ((request.user as any).tier !== "premium") {
    throw new ForbiddenError("Premium plan required");
  }
}

interface AuthPluginOptions {
  logger: Logger;
  redis: Redis;
}

const authPluginFn: FastifyPluginAsync<AuthPluginOptions> = async (
  app: FastifyInstance,
  options: AuthPluginOptions
) => {
  const { logger, redis } = options;

  async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing Authorization header");
    }

    const token = authHeader.slice("Bearer ".length);

    // Check if token is blacklisted (revoked)
    const blacklistKey = RedisKeys.accessTokenBlacklist(token);
    const isBlacklisted = await redis.exists(blacklistKey);

    if (isBlacklisted) {
      logger.debug({ tokenKey: blacklistKey }, "Token is blacklisted");
      throw new UnauthorizedError("Invalid or expired access token");
    }

    const payload = verifyAccessToken(token);

    // Optional: check token revocation via Redis if you decide to store jti.
    request.user = payload;
  }

  async function optionalAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return;
    }

    const token = authHeader.slice("Bearer ".length);
    try {
      // Check if token is blacklisted (revoked)
      const blacklistKey = RedisKeys.accessTokenBlacklist(token);
      const isBlacklisted = await redis.exists(blacklistKey);

      if (isBlacklisted) {
        logger.debug({ tokenKey: blacklistKey }, "Ignoring blacklisted optional access token");
        return;
      }

      const payload = verifyAccessToken(token);
      request.user = payload;
    } catch (err) {
      // For optional auth, we just log and continue without user
      logger.warn({ err }, "Invalid optional access token");
      // Do not throw
      return;
    }
  }

  function requireRole(roles: ("admin" | "editor" | "user")[]) {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      await authenticate(request, _reply);

      if (!request.user) {
        throw new UnauthorizedError();
      }

      if (!roles.includes(request.user.role)) {
        throw new ForbiddenError("Insufficient permissions");
      }
    };
  }

  app.decorate("authenticate", authenticate);
  app.decorate("optionalAuth", optionalAuth);
  app.decorate("requireRole", requireRole);
  app.decorate("requirePremium", requirePremium);

  app.addHook("preHandler", async (request, _reply) => {
    // This hook doesn't enforce auth by default; routes opt-in via preHandler: [app.authenticate]
    // It's here if you want to add global behavior later (e.g. tracing user.id).
    if (request.user) {
      logger.debug({ userId: request.user.userId }, "Authenticated request");
    }
  });

  // Utility to persist refresh tokens, used by auth-service typically
  app.decorateRequest("issueTokens", async function (this: FastifyRequest, user: User) {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      tier: user.tier,
      role: user.role,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken();

    const key = RedisKeys.refreshToken(refreshToken);
    await redis.set(key, user.id, "EX", REFRESH_TOKEN_TTL_SECONDS);

    return { accessToken, refreshToken };
  });
};

export const authPlugin = fp(authPluginFn, {
  name: "auth-plugin",
});

export { requirePremium };

