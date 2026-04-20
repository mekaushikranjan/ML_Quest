"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
class AuthController {
    service;
    constructor(db, redis, logger) {
        this.service = new auth_service_1.AuthService(db, redis, logger);
    }
    async register(dto) {
        const result = await this.service.register(dto);
        return { data: result };
    }
    async login(dto, ip) {
        const result = await this.service.login(dto, ip);
        return { data: result };
    }
    async refreshToken(dto) {
        const result = await this.service.refreshAccessToken(dto.refreshToken);
        return { data: result };
    }
    async logout(dto, accessToken) {
        await this.service.logout(dto.refreshToken, accessToken);
        return { data: null };
    }
    async getMe(userId) {
        const user = await this.service.getUserById(userId);
        return { data: { user } };
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map