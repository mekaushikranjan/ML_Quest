"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDbPool = createDbPool;
exports.query = query;
exports.withTransaction = withTransaction;
const pg_1 = require("pg");
function createDbPool(config, logger) {
    const pool = new pg_1.Pool(config);
    pool.on("error", (err) => {
        logger.error({ err }, "Unexpected Postgres error on idle client");
    });
    return pool;
}
async function query(pool, logger, sql, params = []) {
    const start = process.hrtime.bigint();
    let res;
    try {
        res = await pool.query(sql, params);
    }
    finally {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        if (durationMs > 100) {
            logger.warn({
                sql,
                params,
                durationMs,
            }, "Slow query detected");
        }
    }
    return res.rows;
}
async function withTransaction(pool, logger, fn) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    }
    catch (err) {
        await client.query("ROLLBACK");
        logger.error({ err }, "Transaction failed, rolled back");
        throw err;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=database.js.map