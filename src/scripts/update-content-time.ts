import { db } from '../config/db.js';
import { content } from '../models/schema.js';
import { eq } from 'drizzle-orm';

async function updateContentTime() {
  const now = new Date();
  const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  await db.update(content)
    .set({ startTime, endTime })
    .where(eq(content.uploadedBy, 'b508e140-8949-42ae-9f56-d06e8b3009fe'));

  console.log('Updated content time windows for teacher1');
}

updateContentTime().catch(console.error);
