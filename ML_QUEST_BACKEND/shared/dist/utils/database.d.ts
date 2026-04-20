import { Pool, PoolClient, PoolConfig } from "pg";
import type { Logger } from "pino";
export interface DbConfig extends PoolConfig {
}
export declare function createDbPool(config: DbConfig, logger: Logger): Pool;
export declare function query<T>(pool: Pool, logger: Logger, sql: string, params?: unknown[]): Promise<T[]>;
export declare function withTransaction<T>(pool: Pool, logger: Logger, fn: (client: PoolClient) => Promise<T>): Promise<T>;
