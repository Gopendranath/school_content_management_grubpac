import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';

async function applyIndexes() {
  console.log('Applying database indexes...');

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "content_uploaded_by_idx" ON "content" ("uploaded_by")`);
  console.log('✓ content_uploaded_by_idx');

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "content_status_idx" ON "content" ("status")`);
  console.log('✓ content_status_idx');

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "content_subject_idx" ON "content" ("subject")`);
  console.log('✓ content_subject_idx');

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "content_schedule_slot_id_idx" ON "content_schedule" ("slot_id")`);
  console.log('✓ content_schedule_slot_id_idx');

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "content_schedule_content_id_idx" ON "content_schedule" ("content_id")`);
  console.log('✓ content_schedule_content_id_idx');

  console.log('\nAll indexes applied successfully!');
}

applyIndexes().catch(console.error);
