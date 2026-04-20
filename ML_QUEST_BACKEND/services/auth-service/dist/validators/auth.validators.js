"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoutSchema = exports.RefreshSchema = exports.LoginSchema = exports.RegisterSchema = void 0;
const zod_1 = require("zod");
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    username: zod_1.z.string().min(3).max(32),
    password: zod_1.z.string().min(8).max(128),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
});
exports.RefreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1),
});
exports.LogoutSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1),
});
//# sourceMappingURL=auth.validators.js.map