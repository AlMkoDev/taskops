import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import pg from 'pg';

const { Pool } = pg;
const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');

function requireDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error('DATABASE_URL is required to run db:migrate.');
  }
  return value;
}

async function run() {
  const pool = new Pool({
    connectionString: requireDatabaseUrl(),
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort((left, right) => left.localeCompare(right));

    for (const file of files) {
      const exists = await pool.query('SELECT id FROM schema_migrations WHERE id = $1', [file]);
      if (exists.rowCount && exists.rowCount > 0) {
        console.log(`skip ${file}`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        console.log(`apply ${file}`);
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    }

    console.log('db:migrate complete');
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
