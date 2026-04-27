import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { users } from '../models/schema.js';

const SALT_ROUNDS = 12;

async function seed() {
  // Create principal
  const principalPassword = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  const principal = await db.insert(users).values({
    name: 'Principal Admin',
    email: 'principal@school.com',
    passwordHash: principalPassword,
    role: 'principal',
  }).returning({ id: users.id });

  console.log('Principal created with ID:', principal[0].id);

  // Create teacher 1
  const teacher1Password = await bcrypt.hash('Teacher@123', SALT_ROUNDS);
  const teacher1 = await db.insert(users).values({
    name: 'Teacher One',
    email: 'teacher1@school.com',
    passwordHash: teacher1Password,
    role: 'teacher',
  }).returning({ id: users.id });

  console.log('Teacher 1 created with ID:', teacher1[0].id);

  // Create teacher 2
  const teacher2Password = await bcrypt.hash('Teacher@123', SALT_ROUNDS);
  const teacher2 = await db.insert(users).values({
    name: 'Teacher Two',
    email: 'teacher2@school.com',
    passwordHash: teacher2Password,
    role: 'teacher',
  }).returning({ id: users.id });

  console.log('Teacher 2 created with ID:', teacher2[0].id);

  console.log('Seeding completed.');
}

seed().catch(console.error);