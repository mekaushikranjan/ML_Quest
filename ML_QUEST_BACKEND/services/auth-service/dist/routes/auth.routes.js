"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_controller_1 = require("../controllers/auth.controller");
const auth_validators_1 = require("../validators/auth.validators");
const authRoutes = async (app) => {
    const controller = new auth_controller_1.AuthController(app.db, app.redis, app.log);
    app.post("/register", async (request, reply) => {
        const dto = auth_validators_1.RegisterSchema.parse(request.body);
        const response = await controller.register(dto);
        void reply.status(201).send(response);
    });
    app.post("/login", {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: "1 minute",
            },
        },
    }, async (request, reply) => {
        const dto = auth_validators_1.LoginSchema.parse(request.body);
        const ip = request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
            request.ip;
        const response = await controller.login(dto, ip);
        void reply.send(response);
    });
    app.post("/refresh", async (request, reply) => {
        const dto = auth_validators_1.RefreshSchema.parse(request.body);
        const response = await controller.refreshToken(dto);
        void reply.send(response);
    });
    app.post("/logout", {
        preHandler: app.authenticate,
    }, async (request, reply) => {
        const dto = auth_validators_1.LogoutSchema.parse(request.body);
        const authHeader = request.headers.authorization;
        const token = authHeader.slice("Bearer ".length);
        const response = await controller.logout(dto, token);
        void reply.send(response);
    });
    app.get("/me", {
        preHandler: app.authenticate,
    }, async (request, reply) => {
        const userId = request.user.userId;
        const response = await controller.getMe(userId);
        void reply.send(response);
    });
};
exports.default = authRoutes;
//# sourceMappingURL=auth.routes.js.map