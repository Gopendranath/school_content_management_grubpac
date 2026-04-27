import { db } from '../config/db.js';
import { contentSlots, contentSchedule } from '../models/schema.js';
import { eq, and } from 'drizzle-orm';

async function checkDB() {
  // Get teacher1 ID from the upload response
  const teacherId = 'b508e140-8949-42ae-9f56-d06e8b3009fe';
  const subject = 'Maths';
  const contentId = '33b646f7-dbe1-47ad-aa14-17e321d8aa9e';

  // CHECK 8: content_slot auto-created
  const slots = await db.select().from(contentSlots).where(and(eq(contentSlots.teacherId, teacherId), eq(contentSlots.subject, subject)));
  console.log('CHECK 8 - content_slot auto-created:');
  console.log('Rows found:', slots.length);
  console.log('Slot data:', slots);

  // CHECK 9: content_schedule auto-created
  const schedules = await db.select().from(contentSchedule).where(eq(contentSchedule.contentId, contentId));
  console.log('\nCHECK 9 - content_schedule auto-created:');
  console.log('Rows found:', schedules.length);
  console.log('Schedule data:', schedules);
}

checkDB().catch(console.error);
