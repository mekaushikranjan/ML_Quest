import { Pool, PoolClient, PoolConfig, QueryResult } from "pg";
import type { Logger } from "pino";

export interface DbConfig extends PoolConfig {}

export function createDbPool(config: DbConfig, logger: Logger): Pool {
  const pool = new Pool(config);

  pool.on("error", (err) => {
    logger.error({ err }, "Unexpected Postgres error on idle client");
  });

  return pool;
}

export async function query<T>(
  pool: Pool,
  logger: Logger,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const start = process.hrtime.bigint();
  let res: QueryResult<any>;

  try {
    res = await pool.query(sql, params);
  } finally {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    if (durationMs > 100) {
      logger.warn(
        {
          sql,
          params,
          durationMs,
        },
        "Slow query detected"
      );
    }
  }

  return res.rows;
}

export async function withTransaction<T>(
  pool: Pool,
  logger: Logger,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Transaction failed, rolled back");
    throw err;
  } finally {
    client.release();
  }
}

