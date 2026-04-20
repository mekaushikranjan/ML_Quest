import pino, { Logger, LoggerOptions, LogDescriptor } from "pino";

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

function buildPinoOptions(serviceName: string): LoggerOptions {
  const base: LoggerOptions = {
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
        level(label: string): LogDescriptor {
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

export function createLogger(serviceName: string): Logger {
  const options = buildPinoOptions(serviceName);
  return pino(options);
}

