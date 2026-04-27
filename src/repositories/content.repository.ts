import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import { content, users, contentSlots, contentSchedule } from '../models/schema.js';
import { Content, NewContent, ContentStatus } from '../types/index.js';
import { alias } from 'drizzle-orm/pg-core';

export const contentRepository = {
  async create(data: NewContent): Promise<Content> {
    const [newContent] = await db.insert(content).values(data).returning();
    return newContent;
  },

  async findById(id: string): Promise<Content | null> {
    const [foundContent] = await db.select().from(content).where(eq(content.id, id)).limit(1);
    return foundContent || null;
  },

  async findByTeacherId(teacherId: string): Promise<Content[]> {
    return await db.select().from(content).where(eq(content.uploadedBy, teacherId));
  },

  async findPendingAll(): Promise<(Content & { uploaderName: string; uploaderEmail: string })[]> {
    return await db
      .select({
        id: content.id,
        title: content.title,
        description: content.description,
        subject: content.subject,
        fileUrl: content.fileUrl,
        fileType: content.fileType,
        fileSize: content.fileSize,
        uploadedBy: content.uploadedBy,
        status: content.status,
        rejectionReason: content.rejectionReason,
        approvedBy: content.approvedBy,
        approvedAt: content.approvedAt,
        startTime: content.startTime,
        endTime: content.endTime,
        rotationDuration: content.rotationDuration,
        createdAt: content.createdAt,
        uploaderName: users.name,
        uploaderEmail: users.email,
      })
      .from(content)
      .innerJoin(users, eq(content.uploadedBy, users.id))
      .where(eq(content.status, 'pending'));
  },

  async findAllWithDetails(): Promise<(Content & { uploaderName: string; uploaderEmail: string; approverName?: string | null; approverEmail?: string | null })[]> {
    const approver = alias(users, 'approver');

    return await db
      .select({
        id: content.id,
        title: content.title,
        description: content.description,
        subject: content.subject,
        fileUrl: content.fileUrl,
        fileType: content.fileType,
        fileSize: content.fileSize,
        uploadedBy: content.uploadedBy,
        status: content.status,
        rejectionReason: content.rejectionReason,
        approvedBy: content.approvedBy,
        approvedAt: content.approvedAt,
        startTime: content.startTime,
        endTime: content.endTime,
        rotationDuration: content.rotationDuration,
        createdAt: content.createdAt,
        uploaderName: users.name,
        uploaderEmail: users.email,
        approverName: approver.name,
        approverEmail: approver.email,
      })
      .from(content)
      .innerJoin(users, eq(content.uploadedBy, users.id))
      .leftJoin(approver, eq(content.approvedBy, approver.id));
  },

  async updateStatus(id: string, status: ContentStatus, data?: Partial<Content>): Promise<Content> {
    const updateData = {
      status,
      ...data,
    };

    const [updatedContent] = await db
      .update(content)
      .set(updateData)
      .where(eq(content.id, id))
      .returning();

    return updatedContent;
  },

  async findApprovedByTeacher(teacherId: string, subject?: string): Promise<Content[]> {
    const now = new Date();
    let conditions = [
      eq(content.uploadedBy, teacherId),
      eq(content.status, 'approved'),
      lte(content.startTime, now),
      gte(content.endTime, now),
    ];

    if (subject) {
      conditions.push(sql`LOWER(${content.subject}) = LOWER(${subject})`);
    }

    return await db
      .select()
      .from(content)
      .where(and(...conditions));
  },

  // Additional helper methods for content service
  async findOrCreateContentSlot(teacherId: string, subject: string) {
    // Try to find existing slot
    const [existingSlot] = await db
      .select()
      .from(contentSlots)
      .where(and(eq(contentSlots.teacherId, teacherId), eq(contentSlots.subject, subject)))
      .limit(1);

    if (existingSlot) {
      return existingSlot;
    }

    // Create new slot
    const [newSlot] = await db
      .insert(contentSlots)
      .values({ teacherId, subject })
      .returning();

    return newSlot;
  },

  async getMaxRotationOrder(slotId: string): Promise<number> {
    const result = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${contentSchedule.rotationOrder}), 0)` })
      .from(contentSchedule)
      .where(eq(contentSchedule.slotId, slotId));

    return result[0]?.maxOrder || 0;
  },

  async createContentSchedule(data: {
    contentId: string;
    slotId: string;
    rotationOrder: number;
    duration: number;
  }) {
    const [schedule] = await db.insert(contentSchedule).values(data).returning();
    return schedule;
  },
};