import IORedis, { Redis, RedisOptions } from "ioredis";
import type { Logger } from "pino";

export interface RedisConfig extends RedisOptions {
  url?: string;
}

export function createRedisClient(config: RedisConfig, logger: Logger): Redis {
  const { url, ...rest } = config;

  const client = url ? new IORedis(url, rest) : new IORedis(rest);

  client.on("connect", () => {
    logger.info({ msg: "Redis connected" });
  });

  client.on("error", (err) => {
    logger.error({ err }, "Redis error");
  });

  client.on("reconnecting", () => {
    logger.warn("Redis reconnecting");
  });

  return client;
}

export const RedisKeys = {
  refreshToken(token: string): string {
    return `refresh:${token}`;
  },
  accessTokenBlacklist(token: string): string {
    return `access_bl:${token}`;
  },
  loginAttempts(ip: string): string {
    return `login_attempts:${ip}`;
  },
  problem(slug: string): string {
    return `problem:${slug}`;
  },
  problemList(page: number, hash: string): string {
    return `problems:${page}:${hash}`;
  },
  submissionStatus(id: string): string {
    return `submission:${id}:status`;
  },
  submissionRateLimit(uid: string): string {
    return `submit_rl:${uid}`;
  },
  userStats(uid: string): string {
    return `stats:user:${uid}`;
  },
  problemStats(pid: string): string {
    return `stats:problem:${pid}`;
  },
  leaderboard(): string {
    return "leaderboard:global";
  },
} as const;

export const RedisTTL = {
  // 15 minutes
  ACCESS_TOKEN: 15 * 60,
  // 7 days
  REFRESH_TOKEN: 7 * 24 * 60 * 60,
  // 1 hour
  PROBLEM_CACHE: 60 * 60,
  // 5 minutes
  PROBLEM_LIST_CACHE: 5 * 60,
  // 1 minute
  SUBMISSION_STATUS: 60,
  // 1 hour
  SUBMISSION_RATE_LIMIT_WINDOW: 60 * 60,
  // 24 hours
  USER_STATS: 24 * 60 * 60,
  PROBLEM_STATS: 24 * 60 * 60,
  // 10 minutes
  LEADERBOARD: 10 * 60,
} as const;

