import { neon } from '@neondatabase/serverless';

export function getSql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  return neon(process.env.DATABASE_URL);
}

export async function initDb(sql) {
  await sql`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    phone TEXT,
    referral_code TEXT,
    credits INTEGER DEFAULT 0,
    orders INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    type TEXT,
    plan TEXT,
    addons TEXT,
    total TEXT,
    name TEXT,
    phone TEXT,
    business TEXT,
    coupon TEXT,
    discount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'New',
    user_id TEXT,
    referrer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS newsletter (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
}
