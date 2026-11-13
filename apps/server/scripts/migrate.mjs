import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pg from 'pg';
// Apply the checked-in SQL emitted from the Prisma schema. This small runner
// avoids native schema-engine downloads and supports Windows and Linux equally.
// Keep migrations immutable: checksum mismatches are fatal.
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const url = new URL(process.env.DATABASE_URL);
if ((url.searchParams.get('schema') || 'public') !== 'public')
  throw new Error('These migrations target the public schema.');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('SET search_path TO public');
  await client.query('SELECT pg_advisory_lock(731349825)');
  await client.query(
    'CREATE TABLE IF NOT EXISTS "_sangat_migrations" (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now())',
  );
  const folder = new URL('../prisma/migrations/', import.meta.url);
  for (const entry of (await readdir(folder, { withFileTypes: true }))
    .filter((item) => item.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const sql = await readFile(
      new URL(`${entry.name}/migration.sql`, folder),
      'utf8',
    );
    const checksum = createHash('sha256').update(sql).digest('hex');
    const prior = await client.query(
      'SELECT checksum FROM "_sangat_migrations" WHERE name = $1',
      [entry.name],
    );
    if (prior.rows.length) {
      if (prior.rows[0].checksum !== checksum)
        throw new Error(`Migration changed after application: ${entry.name}`);
      continue;
    }
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO "_sangat_migrations" (name, checksum) VALUES ($1, $2)',
        [entry.name, checksum],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    console.log(`Applied ${entry.name}`);
  }
} finally {
  try {
    await client.query('SELECT pg_advisory_unlock(731349825)');
  } finally {
    client.release();
    await pool.end();
  }
}
