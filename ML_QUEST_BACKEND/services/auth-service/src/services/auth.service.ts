import { Pool } from "pg";
import { Redis } from "ioredis";
import type { Logger } from "pino";
import argon2 from "argon2";
import { AuthTokens, JwtPayload, User, ConflictError, NotFoundError, RateLimitError } from "@ml-quest/shared";
import { RedisKeys, RedisTTL } from "@ml-quest/shared";
import { signAccessToken, signRefreshToken } from "@ml-quest/shared";
import { LoginDto, RegisterDto } from "../validators/auth.validators";

const LOGIN_ATTEMPT_TTL_SECONDS = 15 * 60;
const MAX_LOGIN_ATTEMPTS = 10;

// Precomputed dummy hash to mitigate timing attacks when user is not found.
// This is a valid argon2id hash of a random password.
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$YWJjZGVmZ2hpamtsbW5vcA$F2H7K1F/EZrYWQpM4v7V9XyRphkbg7hK0h8j+axl9JQ";

interface DbUserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  tier: string;
  role: "admin" | "editor" | "user";
  created_at: Date;
  updated_at: Date;
}

export class AuthService {
  constructor(
    private readonly db: Pool,
    private readonly redis: Redis,
    private readonly logger: Logger
  ) { }

  private mapUser(row: DbUserRow): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      tier: row.tier,
      role: row.role,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private buildJwtPayload(user: User): JwtPayload {
    return {
      userId: user.id,
      email: user.email,
      tier: user.tier,
      role: user.role,
    };
  }

  private async generateAndStoreTokens(user: User): Promise<AuthTokens> {
    const payload = this.buildJwtPayload(user);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken();

    const key = RedisKeys.refreshToken(refreshToken);
    await this.redis.set(key, user.id, "EX", RedisTTL.REFRESH_TOKEN);

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, username, password } = dto;

    const existingRes = await this.db.query<DbUserRow>(
      `SELECT id, email, username, password_hash, tier, role, created_at, updated_at
       FROM users
       WHERE email = $1 OR username = $2
       LIMIT 1`,
      [email, username]
    );

    if (existingRes.rows.length > 0) {
      throw new ConflictError("Email or username already in use");
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    const insertRes = await this.db.query<DbUserRow>(
      `INSERT INTO users (email, username, password_hash, tier, role)
       VALUES ($1, $2, $3, 'free', 'user')
       RETURNING id, email, username, password_hash, tier, role, created_at, updated_at`,
      [email, username, passwordHash]
    );

    const user = this.mapUser(insertRes.rows[0]);
    const tokens = await this.generateAndStoreTokens(user);

    return { user, tokens };
  }

  async login(dto: LoginDto, ip: string): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password } = dto;

    const attemptsKey = RedisKeys.loginAttempts(ip);
    const attemptsRaw = await this.redis.get(attemptsKey);
    const attempts = attemptsRaw ? parseInt(attemptsRaw, 10) : 0;

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      throw new RateLimitError("Too many login attempts");
    }

    const res = await this.db.query<DbUserRow>(
      `SELECT id, email, username, password_hash, tier, role, created_at, updated_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );

    const row = res.rows[0];

    const hashToVerify = row?.password_hash || DUMMY_HASH;
    let valid = false;
    try {
      valid = await argon2.verify(hashToVerify, password);
    } catch (err) {
      this.logger.warn({ err }, "argon2.verify failed");
    }

    if (!row || !valid) {
      await this.redis
        .multi()
        .incr(attemptsKey)
        .expire(attemptsKey, LOGIN_ATTEMPT_TTL_SECONDS)
        .exec();

      throw new NotFoundError("Invalid email or password");
    }

    await this.redis.del(attemptsKey);

    const user = this.mapUser(row);
    const tokens = await this.generateAndStoreTokens(user);

    return { user, tokens };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const key = RedisKeys.refreshToken(refreshToken);
    const userId = await this.redis.get(key);

    if (!userId) {
      throw new NotFoundError("Invalid refresh token");
    }

    const res = await this.db.query<DbUserRow>(
      `SELECT id, email, username, password_hash, tier, role, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError("User not found");
    }

    const user = this.mapUser(res.rows[0]);
    const payload = this.buildJwtPayload(user);
    const newAccessToken = signAccessToken(payload);

    // Rotate refresh token
    await this.redis.del(key);
    const newRefreshToken = signRefreshToken();
    const newKey = RedisKeys.refreshToken(newRefreshToken);
    await this.redis.set(newKey, user.id, "EX", RedisTTL.REFRESH_TOKEN);

    return { accessToken: newAccessToken };
  }

  async logout(refreshToken: string, accessToken: string): Promise<void> {
    // Delete refresh token from Redis
    const refreshKey = RedisKeys.refreshToken(refreshToken);
    await this.redis.del(refreshKey);

    // Blacklist the access token to prevent reuse
    const blacklistKey = RedisKeys.accessTokenBlacklist(accessToken);
    await this.redis.set(
      blacklistKey,
      "true",
      "EX",
      RedisTTL.ACCESS_TOKEN
    );

    this.logger.info({ accessToken: accessToken.slice(0, 10) }, "Token blacklisted");
  }

  async getUserById(userId: string): Promise<User> {
    const res = await this.db.query<DbUserRow>(
      `SELECT id, email, username, password_hash, tier, role, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError("User not found");
    }

    return this.mapUser(res.rows[0]);
  }

  async updateUserRole(userId: string, role: "admin" | "editor" | "user"): Promise<User> {
    const res = await this.db.query<DbUserRow>(
      `UPDATE users
       SET role = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, username, password_hash, tier, role, created_at, updated_at`,
      [userId, role]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError("User not found");
    }

    return this.mapUser(res.rows[0]);
  }

  async getUsers(page = 1, limit = 50): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    const [countRes, usersRes] = await Promise.all([
      this.db.query<{ count: string }>('SELECT COUNT(*) as count FROM users'),
      this.db.query<DbUserRow>(
        `SELECT id, email, username, password_hash, tier, role, created_at, updated_at
         FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
    ]);
    return {
      users: usersRes.rows.map(r => this.mapUser(r)),
      total: parseInt(countRes.rows[0].count),
    };
  }
}

