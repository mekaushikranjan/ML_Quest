import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { AuthController } from "../controllers/auth.controller";
import {
  LoginSchema,
  LogoutSchema,
  RefreshSchema,
  RegisterSchema,
  UpdateRoleSchema,
} from "../validators/auth.validators";

const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  const controller = new AuthController(app.db, app.redis, app.log as any);

  // Helper for role-based access since decoration might be stale in dist
  const requireAdmin = async (request: any, reply: any) => {
    await app.authenticate(request, reply);
    if (request.user?.role !== "admin") {
      throw new Error("Insufficient permissions"); // We can use ForbiddenError if available
    }
  };

  app.post("/register", async (request, reply) => {
    const dto = RegisterSchema.parse(request.body);
    const response = await controller.register(dto);
    void reply.status(201).send(response);
  });

  app.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const dto = LoginSchema.parse(request.body);
      const ip =
        (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
        request.ip;

      const response = await controller.login(dto, ip);
      void reply.send(response);
    }
  );

  app.post("/refresh", async (request, reply) => {
    const dto = RefreshSchema.parse(request.body);
    const response = await controller.refreshToken(dto);
    void reply.send(response);
  });

  app.post(
    "/logout",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const dto = LogoutSchema.parse(request.body);
      const authHeader = request.headers.authorization as string;
      const token = authHeader.slice("Bearer ".length);
      const response = await controller.logout(dto, token);
      void reply.send(response);
    }
  );

  app.get(
    "/me",
    {
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const userId = request.user!.userId;
      const response = await controller.getMe(userId);
      void reply.send(response);
    }
  );

  app.patch(
    "/users/:userId/role",
    {
      preHandler: [requireAdmin],
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const dto = UpdateRoleSchema.parse(request.body);
      const response = await (controller as any).updateRole(userId, dto.role);
      void reply.send(response);
    }
  );

  app.get(
    "/users",
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      const { page = '1', limit = '50' } = request.query as { page?: string; limit?: string };
      const response = await (controller as any).getUsers(parseInt(page), parseInt(limit));
      void reply.send(response);
    }
  );
};

export default authRoutes;

