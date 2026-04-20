import type { Pool } from "pg";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import type { ApiResponse, AuthTokens, User } from "@ml-quest/shared";
import type { LoginDto, LogoutDto, RefreshDto, RegisterDto } from "../validators/auth.validators";
interface AuthResult {
    user: User;
    tokens: AuthTokens;
}
export declare class AuthController {
    private readonly service;
    constructor(db: Pool, redis: Redis, logger: Logger);
    register(dto: RegisterDto): Promise<ApiResponse<AuthResult>>;
    login(dto: LoginDto, ip: string): Promise<ApiResponse<AuthResult>>;
    refreshToken(dto: RefreshDto): Promise<ApiResponse<{
        accessToken: string;
    }>>;
    logout(dto: LogoutDto, accessToken: string): Promise<ApiResponse<null>>;
    getMe(userId: string): Promise<ApiResponse<{
        user: User;
    }>>;
}
export {};
