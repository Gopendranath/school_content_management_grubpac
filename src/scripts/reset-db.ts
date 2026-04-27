import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';
import { execSync } from 'child_process';

async function resetDatabase() {
  console.log('Dropping all tables...');
  
  // Drop all tables in correct order (respecting foreign keys)
  await db.execute(sql`DROP TABLE IF EXISTS content_schedule CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS content_slots CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS content CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
  
  console.log('Tables dropped successfully.');
  
  console.log('Running migrations...');
  execSync('npx drizzle-kit push:pg', { stdio: 'inherit' });
  
  console.log('Seeding database...');
  execSync('npx tsx src/scripts/seed.ts', { stdio: 'inherit' });
  
  console.log('Database reset completed successfully.');
}

resetDatabase().catch((error) => {
  console.error('Error resetting database:', error);
  process.exit(1);
});
