import type { Pool } from "pg";
import type { Redis } from "ioredis";
import type { Logger } from "pino";
import type { ApiResponse, AuthTokens, User } from "@ml-quest/shared";
import { AuthService } from "../services/auth.service";
import type { LoginDto, LogoutDto, RefreshDto, RegisterDto } from "../validators/auth.validators";

interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

export class AuthController {
  private readonly service: AuthService;

  constructor(db: Pool, redis: Redis, logger: Logger) {
    this.service = new AuthService(db, redis, logger);
  }

  async register(dto: RegisterDto): Promise<ApiResponse<AuthResult>> {
    const result = await this.service.register(dto);
    return { data: result };
  }

  async login(dto: LoginDto, ip: string): Promise<ApiResponse<AuthResult>> {
    const result = await this.service.login(dto, ip);
    return { data: result };
  }

  async refreshToken(dto: RefreshDto): Promise<ApiResponse<{ accessToken: string }>> {
    const result = await this.service.refreshAccessToken(dto.refreshToken);
    return { data: result };
  }

  async logout(dto: LogoutDto, accessToken: string): Promise<ApiResponse<null>> {
    await this.service.logout(dto.refreshToken, accessToken);
    return { data: null };
  }

  async getMe(userId: string): Promise<ApiResponse<{ user: User }>> {
    const user = await this.service.getUserById(userId);
    return { data: { user } };
  }

  async updateRole(userId: string, role: "admin" | "editor" | "user"): Promise<ApiResponse<{ user: User }>> {
    const user = await this.service.updateUserRole(userId, role);
    return { data: { user } };
  }

  async getUsers(page: number, limit: number): Promise<ApiResponse<{ users: User[]; total: number }>> {
    const result = await this.service.getUsers(page, limit);
    return { data: result };
  }
}

