import { eq } from 'drizzle-orm';
import { db } from '../config/db.js';
import { users } from '../models/schema.js';
import { User, NewUser } from '../types/index.js';

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user || null;
  },

  async findById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || null;
  },

  async create(data: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },
};