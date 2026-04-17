import { Pool as PostgresPool } from 'pg'
import { createPool, Pool as MySqlPool } from 'mysql2/promise'

type DbQueryResult = {
  rows: any[]
  rowCount?: number
  insertId?: number
}

export type DbClient = {
  query: (sql: string, params?: any[]) => Promise<DbQueryResult>
}

let globalDb: DbClient
let mysqlPoolInstance: MySqlPool | undefined
let pgPoolInstance: PostgresPool | undefined

function normalizeSqlForMysql(sql: string) {
  return sql
    .replace(/\$(\d+)/g, '?')
    .replace(/\bILIKE\b/g, 'LIKE')
    .replace(/\bwhere\s+key(\s*=)/gi, 'where `key`$1')
    .replace(/\bkey_value\s*\(\s*key\s*,/gi, 'key_value(`key`,')
    .replace(/\bwhere\s+`?key`?(\s*=)/gi, 'where `key`$1');
}

function createMySqlClient() {
  const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL || '';
  const mysqlHost = process.env.MYSQL_HOST || '';
  const mysqlPort = Number(process.env.MYSQL_PORT || 3306);
  const mysqlUser = process.env.MYSQL_USER || '';
  const mysqlPassword = process.env.MYSQL_PASSWORD || '';
  const mysqlDatabase = process.env.MYSQL_DATABASE || '';

  const pool: MySqlPool = connectionUri
    ? createPool({ uri: connectionUri, waitForConnections: true, connectionLimit: 10 })
    : createPool({
        host: mysqlHost,
        port: mysqlPort,
        user: mysqlUser,
        password: mysqlPassword,
        database: mysqlDatabase,
        waitForConnections: true,
        connectionLimit: 10
      });

  mysqlPoolInstance = pool;

  return {
    async query(sql: string, params: any[] = []) {
      const mysqlSql = normalizeSqlForMysql(sql);
      const [rows] = await pool.query(mysqlSql, params);
      const rowCount = Array.isArray(rows)
        ? rows.length
        : Number((rows as any)?.affectedRows || 0);
      const insertId = Number((rows as any)?.insertId || 0) || undefined;
      return {
        rows: Array.isArray(rows) ? rows : [],
        rowCount,
        insertId
      };
    }
  };
}

function createPostgresClient() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  const pool = new PostgresPool({
    connectionString,
  });
  pgPoolInstance = pool;
  return {
    async query(sql: string, params: any[] = []) {
      const result = await pool.query(sql, params);
      return {
        rows: result.rows || [],
        rowCount: result.rowCount || 0
      };
    }
  };
}

export function getDb() {
  if (!globalDb) {
    const dbClient = (process.env.DB_CLIENT || '').toLowerCase();
    if (dbClient === 'mysql' || process.env.MYSQL_URL || process.env.MYSQL_HOST) {
      globalDb = createMySqlClient();
    } else {
      globalDb = createPostgresClient();
    }
  }
  return globalDb;
}

/** Mirrors getDb() branch so helpers can run dialect-specific SQL. */
export function getDbDialect(): "mysql" | "postgres" {
  const dbClient = (process.env.DB_CLIENT || "").toLowerCase();
  if (dbClient === "mysql" || process.env.MYSQL_URL || process.env.MYSQL_HOST) {
    return "mysql";
  }
  return "postgres";
}

/** True if a base table exists (MySQL / Postgres). */
export async function tableExists(tableName: string): Promise<boolean> {
  const db = getDb();
  const dialect = getDbDialect();
  if (dialect === "mysql") {
    const r = await db.query(
      "SELECT 1 AS x FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = $1 LIMIT 1",
      [tableName]
    );
    return (r.rows?.length || 0) > 0;
  }
  const r = await db.query(
    "SELECT 1 AS x FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1 LIMIT 1",
    [tableName]
  );
  return (r.rows?.length || 0) > 0;
}

function mysqlQueryResult(rows: unknown): DbQueryResult {
  if (Array.isArray(rows)) {
    return { rows, rowCount: rows.length, insertId: undefined };
  }
  const r = rows as { affectedRows?: number; insertId?: number };
  return {
    rows: [],
    rowCount: Number(r?.affectedRows || 0),
    insertId: Number(r?.insertId || 0) || undefined
  };
}

/** Single-connection transaction (required for guest merge). No-op fallback only if pool not initialized. */
export async function withDbTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
  if (!globalDb) getDb();
  if (mysqlPoolInstance) {
    const conn = await mysqlPoolInstance.getConnection();
    await conn.beginTransaction();
    const tx: DbClient = {
      async query(sql: string, params: any[] = []) {
        const mysqlSql = normalizeSqlForMysql(sql);
        const [rows] = await conn.query(mysqlSql, params);
        return mysqlQueryResult(rows);
      }
    };
    try {
      const out = await fn(tx);
      await conn.commit();
      return out;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
  if (pgPoolInstance) {
    const conn = await pgPoolInstance.connect();
    const tx: DbClient = {
      async query(sql: string, params: any[] = []) {
        const result = await conn.query(sql, params);
        return {
          rows: result.rows || [],
          rowCount: result.rowCount || 0,
          insertId: undefined
        };
      }
    };
    try {
      await conn.query("BEGIN");
      const out = await fn(tx);
      await conn.query("COMMIT");
      return out;
    } catch (e) {
      await conn.query("ROLLBACK");
      throw e;
    } finally {
      conn.release();
    }
  }
  return fn(getDb());
}
