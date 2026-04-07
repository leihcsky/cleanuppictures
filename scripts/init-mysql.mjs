import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function getConfig() {
  const cwd = process.cwd();
  const localEnv = readEnvFile(path.join(cwd, '.env.local'));
  const prodEnv = readEnvFile(path.join(cwd, '.env.production'));
  const merged = { ...prodEnv, ...localEnv, ...process.env };
  return {
    url: merged.MYSQL_URL || '',
    host: merged.MYSQL_HOST || '127.0.0.1',
    port: Number(merged.MYSQL_PORT || 3306),
    user: merged.MYSQL_USER || '',
    password: merged.MYSQL_PASSWORD || '',
    database: merged.MYSQL_DATABASE || '',
  };
}

async function main() {
  const config = getConfig();
  const projectRoot = process.cwd();
  const connection = config.url
    ? await mysql.createConnection(config.url)
    : await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });
  const tablesDir = path.join(projectRoot, 'sql', 'tables');
  const files = fs
    .readdirSync(tablesDir)
    .filter((name) => /^A\d+_.+\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const fileName of files) {
    const fullPath = path.join(tablesDir, fileName);
    const sql = fs.readFileSync(fullPath, 'utf8').trim();
    if (sql) {
      await connection.query(sql);
    }
  }
  await connection.end();
  console.log(`MySQL schema initialized successfully from ${files.length} table scripts.`);
}

main().catch((error) => {
  console.error('Failed to initialize MySQL schema:', error.message);
  process.exit(1);
});
