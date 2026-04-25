#!/usr/bin/env node
/**
 * AgriReports Database CLI
 * Usage:
 *   npm run db:migrate          - Run all pending migrations
 *   npm run db:seed             - Run seed data (development only)
 *   npm run db:reset            - Drop and recreate all tables
 *   npm run db:status           - Show migration status
 */

import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..');

const MIGRATIONS_DIR = path.join(projectRoot, 'src', 'db', 'migrations');
const SEEDS_DIR = path.join(projectRoot, 'src', 'db', 'seeds');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// ============================================================
// Migration Functions
// ============================================================

async function runMigrations() {
  log(colors.blue, '\n🚀 Running AgriReports migrations...\n');
  
  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get all migration files
  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    // Check if already applied
    const result = await pool.query(
      'SELECT id FROM schema_migrations WHERE id = $1',
      [file]
    );

    if (result.rowCount > 0) {
      log(colors.yellow, `⏭️  Skipped: ${file} (already applied)`);
      skipped++;
      continue;
    }

    // Apply migration
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    
    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      
      log(colors.green, `✅ Applied: ${file}`);
      applied++;
    } catch (error) {
      await pool.query('ROLLBACK');
      log(colors.red, `❌ Failed: ${file}`);
      log(colors.red, `   Error: ${error.message}`);
      process.exit(1);
    }
  }

  log(colors.green, `\n✨ Migration complete: ${applied} applied, ${skipped} skipped\n`);
}

async function showMigrationStatus() {
  log(colors.blue, '\n📊 Migration Status\n');
  
  // Create migrations tracking table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get all migration files
  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  // Get applied migrations
  const result = await pool.query('SELECT id, applied_at FROM schema_migrations ORDER BY id');
  const appliedMap = new Map();
  for (const row of result.rows) {
    appliedMap.set(row.id, row.applied_at);
  }

  // Display status
  for (const file of files) {
    if (appliedMap.has(file)) {
      const date = new Date(appliedMap.get(file)).toLocaleString();
      log(colors.green, `✅ ${file} - Applied: ${date}`);
    } else {
      log(colors.yellow, `⏳ ${file} - Pending`);
    }
  }

  log(colors.blue, `\nTotal: ${files.length} migrations, ${appliedMap.size} applied, ${files.length - appliedMap.size} pending\n`);
}

// ============================================================
// Seed Functions
// ============================================================

async function runSeeds() {
  if (process.env.NODE_ENV === 'production') {
    log(colors.red, '\n❌ Cannot run seeds in production!\n');
    process.exit(1);
  }

  log(colors.blue, '\n🌱 Running AgriReports seeds...\n');

  // Check if seeds directory exists
  try {
    await fs.access(SEEDS_DIR);
  } catch {
    log(colors.yellow, '⚠️  No seeds directory found');
    return;
  }

  // Get all seed files
  const files = (await fs.readdir(SEEDS_DIR))
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  for (const file of files) {
    const sql = await fs.readFile(path.join(SEEDS_DIR, file), 'utf8');
    
    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query('COMMIT');
      
      log(colors.green, `✅ Seeded: ${file}`);
    } catch (error) {
      await pool.query('ROLLBACK');
      log(colors.red, `❌ Failed: ${file}`);
      log(colors.red, `   Error: ${error.message}`);
      process.exit(1);
    }
  }

  log(colors.green, `\n✨ Seeding complete\n`);
}

// ============================================================
// Database Reset
// ============================================================

async function resetDatabase() {
  if (process.env.NODE_ENV === 'production') {
    log(colors.red, '\n❌ Cannot reset database in production!\n');
    process.exit(1);
  }

  log(colors.red, '\n⚠️  WARNING: This will drop all AgriReports tables!\n');
  log(colors.yellow, 'Dropping tables...\n');

  // Drop tables in correct order (respecting foreign keys)
  const dropStatements = [
    'DROP TABLE IF EXISTS agri_whatsapp_messages CASCADE',
    'DROP TABLE IF EXISTS agri_notifications CASCADE',
    'DROP TABLE IF EXISTS agri_report_activity CASCADE',
    'DROP TABLE IF EXISTS agri_report_audit_log CASCADE',
    'DROP TABLE IF EXISTS agri_reports CASCADE',
    'DROP TABLE IF EXISTS agri_users CASCADE',
    'DROP TABLE IF EXISTS v_reports_full',
    'DROP TABLE IF EXISTS v_pending_reviews',
    'DROP TABLE IF EXISTS v_notification_stats',
  ];

  for (const statement of dropStatements) {
    await pool.query(statement);
  }

  log(colors.yellow, 'Tables dropped. Running migrations...\n');
  
  // Re-run migrations
  await runMigrations();
  
  log(colors.green, '\n✨ Database reset complete\n');
}

// ============================================================
// Main Entry Point
// ============================================================

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'migrate':
        await runMigrations();
        break;
      
      case 'seed':
        await runSeeds();
        break;
      
      case 'reset':
        await resetDatabase();
        break;
      
      case 'status':
        await showMigrationStatus();
        break;
      
      default:
        log(colors.cyan, '\n📦 AgriReports Database CLI\n');
        log(colors.white, 'Usage:');
        log(colors.white, '  npm run db:migrate          - Run all pending migrations');
        log(colors.white, '  npm run db:seed             - Run seed data (development only)');
        log(colors.white, '  npm run db:reset            - Drop and recreate all tables');
        log(colors.white, '  npm run db:status           - Show migration status\n');
        break;
    }
  } catch (error) {
    log(colors.red, `\n❌ Error: ${error.message}\n`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
