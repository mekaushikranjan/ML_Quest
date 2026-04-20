"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authPlugin = void 0;
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.requirePremium = requirePremium;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("../errors");
const redis_1 = require("../utils/redis");
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_SECONDS = redis_1.RedisTTL.REFRESH_TOKEN;
function signAccessToken(payload) {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is not configured");
    }
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: ACCESS_TOKEN_TTL_SECONDS });
}
function signRefreshToken() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
function verifyAccessToken(token) {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is not configured");
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        return decoded;
    }
    catch (err) {
        throw new errors_1.UnauthorizedError("Invalid or expired access token");
    }
}
async function requirePremium(request, _reply) {
    if (!request.user) {
        throw new errors_1.UnauthorizedError();
    }
    if (request.user.tier !== "premium") {
        throw new errors_1.ForbiddenError("Premium plan required");
    }
}
const authPluginFn = async (app, options) => {
    const { logger, redis } = options;
    async function authenticate(request, _reply) {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new errors_1.UnauthorizedError("Missing Authorization header");
        }
        const token = authHeader.slice("Bearer ".length);
        // Check if token is blacklisted (revoked)
        const blacklistKey = redis_1.RedisKeys.accessTokenBlacklist(token);
        const isBlacklisted = await redis.exists(blacklistKey);
        if (isBlacklisted) {
            logger.debug({ tokenKey: blacklistKey }, "Token is blacklisted");
            throw new errors_1.UnauthorizedError("Invalid or expired access token");
        }
        const payload = verifyAccessToken(token);
        // Optional: check token revocation via Redis if you decide to store jti.
        request.user = payload;
    }
    async function optionalAuth(request, reply) {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return;
        }
        const token = authHeader.slice("Bearer ".length);
        try {
            // Check if token is blacklisted (revoked)
            const blacklistKey = redis_1.RedisKeys.accessTokenBlacklist(token);
            const isBlacklisted = await redis.exists(blacklistKey);
            if (isBlacklisted) {
                logger.debug({ tokenKey: blacklistKey }, "Ignoring blacklisted optional access token");
                return;
            }
            const payload = verifyAccessToken(token);
            request.user = payload;
        }
        catch (err) {
            // For optional auth, we just log and continue without user
            logger.warn({ err }, "Invalid optional access token");
            // Do not throw
            return;
        }
    }
    app.decorate("authenticate", authenticate);
    app.decorate("optionalAuth", optionalAuth);
    app.decorate("requirePremium", requirePremium);
    app.addHook("preHandler", async (request, _reply) => {
        // This hook doesn't enforce auth by default; routes opt-in via preHandler: [app.authenticate]
        // It's here if you want to add global behavior later (e.g. tracing user.id).
        if (request.user) {
            logger.debug({ userId: request.user.userId }, "Authenticated request");
        }
    });
    // Utility to persist refresh tokens, used by auth-service typically
    app.decorateRequest("issueTokens", async function (user) {
        const payload = {
            userId: user.id,
            email: user.email,
            tier: user.tier,
        };
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken();
        const key = redis_1.RedisKeys.refreshToken(refreshToken);
        await redis.set(key, user.id, "EX", REFRESH_TOKEN_TTL_SECONDS);
        return { accessToken, refreshToken };
    });
};
exports.authPlugin = (0, fastify_plugin_1.default)(authPluginFn, {
    name: "auth-plugin",
});
//# sourceMappingURL=auth.js.map