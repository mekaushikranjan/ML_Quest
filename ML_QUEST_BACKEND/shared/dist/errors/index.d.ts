export type AppErrorCode = "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "SERVICE_UNAVAILABLE" | (string & {});
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: AppErrorCode;
    readonly details?: unknown;
    constructor(message: string, statusCode: number, code: AppErrorCode, details?: unknown);
}
export declare class ValidationError extends AppError {
    constructor(message?: string, details?: unknown);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string, details?: unknown);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string, details?: unknown);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string, details?: unknown);
}
export declare class ConflictError extends AppError {
    constructor(message?: string, details?: unknown);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string, details?: unknown);
}
export declare class ServiceUnavailableError extends AppError {
    constructor(message?: string, details?: unknown);
}
export declare function isAppError(error: unknown): error is AppError;
