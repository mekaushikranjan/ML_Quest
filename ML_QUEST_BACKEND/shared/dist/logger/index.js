"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
const redactFields = [
    "password",
    "passwordHash",
    "accessToken",
    "refreshToken",
    "*.password",
    "*.passwordHash",
    "*.accessToken",
    "*.refreshToken",
];
function buildPinoOptions(serviceName) {
    const base = {
        name: serviceName,
        redact: {
            paths: redactFields,
            remove: true,
        },
        level: process.env.LOG_LEVEL || "info",
    };
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
        // JSON output for log aggregation systems (Datadog, Loki, etc.)
        return {
            ...base,
            formatters: {
                level(label) {
                    return { level: label };
                },
            },
        };
    }
    // Development: pretty-printed, colored logs
    return {
        ...base,
        transport: {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
            },
        },
    };
}
function createLogger(serviceName) {
    const options = buildPinoOptions(serviceName);
    return (0, pino_1.default)(options);
}
//# sourceMappingURL=index.js.map