import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Server-only. Never import this file into a Client Component — Neon's
// connection string must stay off the browser entirely (unlike Supabase's
// anon key, there is no safe client-side key here).
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.');
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
