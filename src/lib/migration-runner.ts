import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import { Pool } from 'pg';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'db', 'migrations');

export async function runMigrations(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  for (const file of files) {
    const alreadyApplied = await pool.query<{ id: string }>('SELECT id FROM schema_migrations WHERE id = $1', [file]);
    if (alreadyApplied.rowCount && alreadyApplied.rowCount > 0) continue;

    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
}
