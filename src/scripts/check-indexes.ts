import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';

async function checkIndexes() {
  console.log('Checking content table indexes...\n');

  const result = await db.execute(sql`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'content'
    ORDER BY indexname;
  `);

  console.log('Indexes on content table:');
  console.table(result);

  console.log('\nExpected indexes:');
  console.log('- content_uploaded_by_idx');
  console.log('- content_status_idx');
  console.log('- content_subject_idx');
}

checkIndexes().catch(console.error);
