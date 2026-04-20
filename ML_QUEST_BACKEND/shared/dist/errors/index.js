"use strict";
// Centralised application error types that map cleanly to HTTP status codes.
// These are thrown inside services and translated to HTTP responses by Fastify.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUnavailableError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.AppError = void 0;
exports.isAppError = isAppError;
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode, code, details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        const anyError = Error;
        if (typeof anyError.captureStackTrace === "function") {
            anyError.captureStackTrace(this, this.constructor);
        }
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message = "Validation failed", details) {
        super(message, 400, "VALIDATION_ERROR", details);
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized", details) {
        super(message, 401, "UNAUTHORIZED", details);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = "Forbidden", details) {
        super(message, 403, "FORBIDDEN", details);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = "Not Found", details) {
        super(message, 404, "NOT_FOUND", details);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = "Conflict", details) {
        super(message, 409, "CONFLICT", details);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = "Too Many Requests", details) {
        super(message, 429, "RATE_LIMITED", details);
    }
}
exports.RateLimitError = RateLimitError;
class ServiceUnavailableError extends AppError {
    constructor(message = "Service Unavailable", details) {
        super(message, 503, "SERVICE_UNAVAILABLE", details);
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
function isAppError(error) {
    return (error instanceof AppError ||
        (typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            "code" in error &&
            typeof error.statusCode === "number" &&
            typeof error.code === "string"));
}
//# sourceMappingURL=index.js.map