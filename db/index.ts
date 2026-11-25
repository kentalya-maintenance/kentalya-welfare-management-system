
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};

function createPool() {
  if (
    !process.env.DB_HOST ||
    !process.env.DB_USER ||
    !process.env.DB_NAME
  ) {
    throw new Error(
      'Database configuration is missing. Check your environment variables.',
    );
  }

  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    timezone: '+03:00',
  });
}

const pool =
  globalForDb.mysqlPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.mysqlPool = pool;
}

export const db = drizzle(pool, {
  schema,
  mode: 'default',
});

export { pool };
