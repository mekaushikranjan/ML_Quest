import { Pool } from "pg";
import { Redis } from "ioredis";
import type { Logger } from "pino";
import { AuthTokens, User } from "@ml-quest/shared";
import { LoginDto, RegisterDto } from "../validators/auth.validators";
export declare class AuthService {
    private readonly db;
    private readonly redis;
    private readonly logger;
    constructor(db: Pool, redis: Redis, logger: Logger);
    private mapUser;
    private buildJwtPayload;
    private generateAndStoreTokens;
    register(dto: RegisterDto): Promise<{
        user: User;
        tokens: AuthTokens;
    }>;
    login(dto: LoginDto, ip: string): Promise<{
        user: User;
        tokens: AuthTokens;
    }>;
    refreshAccessToken(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    logout(refreshToken: string, accessToken: string): Promise<void>;
    getUserById(userId: string): Promise<User>;
}
