import { pool } from '../config/db.js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigrations() {
  const migrationPath = join(process.cwd(), 'drizzle', '0000_plain_war_machine.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('Running migrations...');

  try {
    await pool.query(migrationSQL);
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigrations();