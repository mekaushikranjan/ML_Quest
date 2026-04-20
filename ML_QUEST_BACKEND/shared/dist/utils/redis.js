"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisTTL = exports.RedisKeys = void 0;
exports.createRedisClient = createRedisClient;
const ioredis_1 = __importDefault(require("ioredis"));
function createRedisClient(config, logger) {
    const { url, ...rest } = config;
    const client = url ? new ioredis_1.default(url, rest) : new ioredis_1.default(rest);
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
exports.RedisKeys = {
    refreshToken(token) {
        return `refresh:${token}`;
    },
    accessTokenBlacklist(token) {
        return `access_bl:${token}`;
    },
    loginAttempts(ip) {
        return `login_attempts:${ip}`;
    },
    problem(slug) {
        return `problem:${slug}`;
    },
    problemList(page, hash) {
        return `problems:${page}:${hash}`;
    },
    submissionStatus(id) {
        return `submission:${id}:status`;
    },
    submissionRateLimit(uid) {
        return `submit_rl:${uid}`;
    },
    userStats(uid) {
        return `stats:user:${uid}`;
    },
    problemStats(pid) {
        return `stats:problem:${pid}`;
    },
    leaderboard() {
        return "leaderboard:global";
    },
};
exports.RedisTTL = {
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
};
//# sourceMappingURL=redis.js.map