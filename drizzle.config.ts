
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import path from 'node:path';

config({
  path: path.resolve(process.cwd(), '.env.local'),
});

console.log('Welfare database configuration:', {
  hostLoaded: !!process.env.DB_HOST,
  userLoaded: !!process.env.DB_USER,
  databaseLoaded: !!process.env.DB_NAME,
  passwordLoaded: !!process.env.DB_PASSWORD,
});

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
  throw new Error('Database credentials missing. Check .env.local.');
}

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  },
  strict: true,
  verbose: true,
});
