"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const argon2_1 = __importDefault(require("argon2"));
const shared_1 = require("@ml-quest/shared");
const shared_2 = require("@ml-quest/shared");
const shared_3 = require("@ml-quest/shared");
const LOGIN_ATTEMPT_TTL_SECONDS = 15 * 60;
const MAX_LOGIN_ATTEMPTS = 10;
// Precomputed dummy hash to mitigate timing attacks when user is not found.
// This is a valid argon2id hash of a random password.
const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$YWJjZGVmZ2hpamtsbW5vcA$F2H7K1F/EZrYWQpM4v7V9XyRphkbg7hK0h8j+axl9JQ";
class AuthService {
    db;
    redis;
    logger;
    constructor(db, redis, logger) {
        this.db = db;
        this.redis = redis;
        this.logger = logger;
    }
    mapUser(row) {
        return {
            id: row.id,
            email: row.email,
            username: row.username,
            tier: row.tier,
            createdAt: row.created_at.toISOString(),
            updatedAt: row.updated_at.toISOString(),
        };
    }
    buildJwtPayload(user) {
        return {
            userId: user.id,
            email: user.email,
            tier: user.tier,
        };
    }
    async generateAndStoreTokens(user) {
        const payload = this.buildJwtPayload(user);
        const accessToken = (0, shared_3.signAccessToken)(payload);
        const refreshToken = (0, shared_3.signRefreshToken)();
        const key = shared_2.RedisKeys.refreshToken(refreshToken);
        await this.redis.set(key, user.id, "EX", shared_2.RedisTTL.REFRESH_TOKEN);
        return { accessToken, refreshToken };
    }
    async register(dto) {
        const { email, username, password } = dto;
        const existingRes = await this.db.query(`SELECT id, email, username, password_hash, tier, created_at, updated_at
       FROM users
       WHERE email = $1 OR username = $2
       LIMIT 1`, [email, username]);
        if (existingRes.rows.length > 0) {
            throw new shared_1.ConflictError("Email or username already in use");
        }
        const passwordHash = await argon2_1.default.hash(password, {
            type: argon2_1.default.argon2id,
            memoryCost: 65536,
            timeCost: 3,
        });
        const insertRes = await this.db.query(`INSERT INTO users (email, username, password_hash, tier)
       VALUES ($1, $2, $3, 'free')
       RETURNING id, email, username, password_hash, tier, created_at, updated_at`, [email, username, passwordHash]);
        const user = this.mapUser(insertRes.rows[0]);
        const tokens = await this.generateAndStoreTokens(user);
        return { user, tokens };
    }
    async login(dto, ip) {
        const { email, password } = dto;
        const attemptsKey = shared_2.RedisKeys.loginAttempts(ip);
        const attemptsRaw = await this.redis.get(attemptsKey);
        const attempts = attemptsRaw ? parseInt(attemptsRaw, 10) : 0;
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            throw new shared_1.RateLimitError("Too many login attempts");
        }
        const res = await this.db.query(`SELECT id, email, username, password_hash, tier, created_at, updated_at
       FROM users
       WHERE email = $1
       LIMIT 1`, [email]);
        const row = res.rows[0];
        const hashToVerify = row?.password_hash || DUMMY_HASH;
        let valid = false;
        try {
            valid = await argon2_1.default.verify(hashToVerify, password);
        }
        catch (err) {
            this.logger.warn({ err }, "argon2.verify failed");
        }
        if (!row || !valid) {
            await this.redis
                .multi()
                .incr(attemptsKey)
                .expire(attemptsKey, LOGIN_ATTEMPT_TTL_SECONDS)
                .exec();
            throw new shared_1.NotFoundError("Invalid email or password");
        }
        await this.redis.del(attemptsKey);
        const user = this.mapUser(row);
        const tokens = await this.generateAndStoreTokens(user);
        return { user, tokens };
    }
    async refreshAccessToken(refreshToken) {
        const key = shared_2.RedisKeys.refreshToken(refreshToken);
        const userId = await this.redis.get(key);
        if (!userId) {
            throw new shared_1.NotFoundError("Invalid refresh token");
        }
        const res = await this.db.query(`SELECT id, email, username, password_hash, tier, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`, [userId]);
        if (res.rows.length === 0) {
            throw new shared_1.NotFoundError("User not found");
        }
        const user = this.mapUser(res.rows[0]);
        const payload = this.buildJwtPayload(user);
        const newAccessToken = (0, shared_3.signAccessToken)(payload);
        // Rotate refresh token
        await this.redis.del(key);
        const newRefreshToken = (0, shared_3.signRefreshToken)();
        const newKey = shared_2.RedisKeys.refreshToken(newRefreshToken);
        await this.redis.set(newKey, user.id, "EX", shared_2.RedisTTL.REFRESH_TOKEN);
        return { accessToken: newAccessToken };
    }
    async logout(refreshToken, accessToken) {
        // Delete refresh token from Redis
        const refreshKey = shared_2.RedisKeys.refreshToken(refreshToken);
        await this.redis.del(refreshKey);
        // Blacklist the access token to prevent reuse
        const blacklistKey = shared_2.RedisKeys.accessTokenBlacklist(accessToken);
        await this.redis.set(blacklistKey, "true", "EX", shared_2.RedisTTL.ACCESS_TOKEN);
        this.logger.info({ accessToken: accessToken.slice(0, 10) }, "Token blacklisted");
    }
    async getUserById(userId) {
        const res = await this.db.query(`SELECT id, email, username, password_hash, tier, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`, [userId]);
        if (res.rows.length === 0) {
            throw new shared_1.NotFoundError("User not found");
        }
        return this.mapUser(res.rows[0]);
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map