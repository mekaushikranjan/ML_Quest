import { Redis, RedisOptions } from "ioredis";
import type { Logger } from "pino";
export interface RedisConfig extends RedisOptions {
    url?: string;
}
export declare function createRedisClient(config: RedisConfig, logger: Logger): Redis;
export declare const RedisKeys: {
    readonly refreshToken: (token: string) => string;
    readonly accessTokenBlacklist: (token: string) => string;
    readonly loginAttempts: (ip: string) => string;
    readonly problem: (slug: string) => string;
    readonly problemList: (page: number, hash: string) => string;
    readonly submissionStatus: (id: string) => string;
    readonly submissionRateLimit: (uid: string) => string;
    readonly userStats: (uid: string) => string;
    readonly problemStats: (pid: string) => string;
    readonly leaderboard: () => string;
};
export declare const RedisTTL: {
    readonly ACCESS_TOKEN: number;
    readonly REFRESH_TOKEN: number;
    readonly PROBLEM_CACHE: number;
    readonly PROBLEM_LIST_CACHE: number;
    readonly SUBMISSION_STATUS: 60;
    readonly SUBMISSION_RATE_LIMIT_WINDOW: number;
    readonly USER_STATS: number;
    readonly PROBLEM_STATS: number;
    readonly LEADERBOARD: number;
};
