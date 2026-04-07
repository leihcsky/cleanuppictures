import { Pool as PostgresPool } from 'pg'
import { createPool, Pool as MySqlPool } from 'mysql2/promise'

type DbQueryResult = {
  rows: any[]
  rowCount?: number
  insertId?: number
}

type DbClient = {
  query: (sql: string, params?: any[]) => Promise<DbQueryResult>
}

let globalDb: DbClient

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
