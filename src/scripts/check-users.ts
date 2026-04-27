import { db } from '../config/db.js';
import { users } from '../models/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function checkUsers() {
  const allUsers = await db.select().from(users);
  console.log('All users in database:');
  console.log(JSON.stringify(allUsers, null, 2));

  // Check if teacher1 exists
  const teacher1 = await db.select().from(users).where(eq(users.email, 'teacher1@school.com'));
  console.log('\nTeacher1 exists:', teacher1.length > 0);

  // Check if principal exists
  const principal = await db.select().from(users).where(eq(users.email, 'principal@school.com'));
  console.log('Principal exists:', principal.length > 0);
}

checkUsers().catch(console.error);
