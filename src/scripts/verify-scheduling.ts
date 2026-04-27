import { db } from '../config/db.js';
import { content } from '../models/schema.js';
import { schedulingService, calculateActiveIndex, EPOCH_ANCHOR } from '../services/scheduling.service.js';
import { eq } from 'drizzle-orm';
import { logger } from '../config/logger.js';

const TEACHER1_ID = 'b508e140-8949-42ae-9f56-d06e8b3009fe';
const PRINCIPAL_ID = '33e51ac9-8374-4274-9628-eda69c6b78c2';

async function setupContent() {
  console.log('\n=== SETUP: Creating and approving test content ===\n');

  const now = new Date();
  const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
  const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  // Create Maths content 1 (5 min duration)
  const [content1] = await db.insert(content).values({
    title: 'Maths Content 1 - Scheduling Test',
    description: 'First maths content for scheduling verification',
    subject: 'Maths',
    fileUrl: 'maths1-scheduling.png',
    fileType: 'png',
    fileSize: 1824,
    uploadedBy: TEACHER1_ID,
    status: 'approved',
    approvedBy: PRINCIPAL_ID,
    approvedAt: now,
    startTime,
    endTime,
    rotationDuration: 5,
  }).returning();
  console.log('Created content1 (Maths, 5min):', content1.id);

  // Create Maths content 2 (5 min duration)
  const [content2] = await db.insert(content).values({
    title: 'Maths Content 2 - Scheduling Test',
    description: 'Second maths content for scheduling verification',
    subject: 'Maths',
    fileUrl: 'maths2-scheduling.png',
    fileType: 'png',
    fileSize: 1824,
    uploadedBy: TEACHER1_ID,
    status: 'approved',
    approvedBy: PRINCIPAL_ID,
    approvedAt: now,
    startTime,
    endTime,
    rotationDuration: 5,
  }).returning();
  console.log('Created content2 (Maths, 5min):', content2.id);

  // Create Science content 3 (3 min duration)
  const [content3] = await db.insert(content).values({
    title: 'Science Content 1 - Scheduling Test',
    description: 'Science content for scheduling verification',
    subject: 'Science',
    fileUrl: 'science1-scheduling.png',
    fileType: 'png',
    fileSize: 1824,
    uploadedBy: TEACHER1_ID,
    status: 'approved',
    approvedBy: PRINCIPAL_ID,
    approvedAt: now,
    startTime,
    endTime,
    rotationDuration: 3,
  }).returning();
  console.log('Created content3 (Science, 3min):', content3.id);

  return { content1, content2, content3 };
}

async function cleanupContent() {
  console.log('\n=== CLEANUP: Removing test content ===\n');
  await db.delete(content).where(eq(content.uploadedBy, TEACHER1_ID));
  console.log('Deleted all test content for teacher1');
}

async function check1_DeterministicOutput() {
  console.log('\n=== CHECK 1: Deterministic Output ===\n');
  
  const results: string[] = [];
  for (let i = 0; i < 10; i++) {
    const result = await schedulingService.getActiveContentForTeacher(TEACHER1_ID, 'Maths');
    if (result.available && result.data) {
      results.push((result.data as any).id);
    }
    // Small delay to ensure different milliseconds
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  const allSame = results.every(id => id === results[0]);
  console.log('10 calls results:', results);
  console.log('All same:', allSame);
  
  if (allSame) {
    console.log('✅ CHECK 1 PASSED: All 10 calls returned the same content');
  } else {
    console.log('❌ CHECK 1 FAILED: Results are not deterministic');
  }
  
  return allSame;
}

async function check2_RotationCycles() {
  console.log('\n=== CHECK 2: Rotation Cycles Math ===\n');
  
  const anchorMs = EPOCH_ANCHOR.getTime();
  const items = [{ duration: 5 }, { duration: 5 }];
  
  // Test 1: 3 min into cycle (should return index 0)
  const result1 = calculateActiveIndex(items, anchorMs + 3 * 60000, anchorMs);
  console.log(`3 min into cycle: index ${result1} (expected 0)`);
  const test1 = result1 === 0;
  
  // Test 2: 7 min into cycle (should return index 1)
  const result2 = calculateActiveIndex(items, anchorMs + 7 * 60000, anchorMs);
  console.log(`7 min into cycle: index ${result2} (expected 1)`);
  const test2 = result2 === 1;
  
  // Test 3: 11 min into cycle (should return index 0 - second loop)
  const result3 = calculateActiveIndex(items, anchorMs + 11 * 60000, anchorMs);
  console.log(`11 min into cycle: index ${result3} (expected 0)`);
  const test3 = result3 === 0;
  
  if (test1 && test2 && test3) {
    console.log('✅ CHECK 2 PASSED: Rotation cycles math is correct');
  } else {
    console.log('❌ CHECK 2 FAILED: Rotation cycles math is incorrect');
  }
  
  return test1 && test2 && test3;
}

async function check3_SubjectFilter() {
  console.log('\n=== CHECK 3: Subject Filter Works ===\n');
  
  const mathsResult = await schedulingService.getActiveContentForTeacher(TEACHER1_ID, 'Maths');
  const scienceResult = await schedulingService.getActiveContentForTeacher(TEACHER1_ID, 'Science');
  
  const mathsSubject = mathsResult.available && mathsResult.data ? (mathsResult.data as any).subject : null;
  const scienceSubject = scienceResult.available && scienceResult.data ? (scienceResult.data as any).subject : null;
  
  console.log('Maths filter result subject:', mathsSubject);
  console.log('Science filter result subject:', scienceSubject);
  
  const test1 = mathsSubject === 'Maths';
  const test2 = scienceSubject === 'Science';
  
  if (test1 && test2) {
    console.log('✅ CHECK 3 PASSED: Subject filter works correctly');
  } else {
    console.log('❌ CHECK 3 FAILED: Subject filter is incorrect');
  }
  
  return test1 && test2;
}

async function check4_WrongTeacher() {
  console.log('\n=== CHECK 4: No Content Available (Wrong Teacher) ===\n');
  
  const result = await schedulingService.getActiveContentForTeacher('00000000-0000-0000-0000-000000000000');
  
  console.log('Result:', result);
  
  const test = result.available === false && result.data === null && result.message === 'No content available';
  
  if (test) {
    console.log('✅ CHECK 4 PASSED: Wrong teacher returns no content');
  } else {
    console.log('❌ CHECK 4 FAILED: Wrong teacher response is incorrect');
  }
  
  return test;
}

async function check5_OutsideTimeWindow() {
  console.log('\n=== CHECK 5: Outside Time Window (Past Content) ===\n');
  
  // Create content with past time window
  const pastStartTime = new Date('2020-01-01T00:00:00Z');
  const pastEndTime = new Date('2020-12-31T23:59:59Z');
  
  const [pastContent] = await db.insert(content).values({
    title: 'Past Content Test',
    description: 'Content with past time window',
    subject: 'History',
    fileUrl: 'past.png',
    fileType: 'png',
    fileSize: 1824,
    uploadedBy: TEACHER1_ID,
    status: 'approved',
    approvedBy: PRINCIPAL_ID,
    approvedAt: new Date(),
    startTime: pastStartTime,
    endTime: pastEndTime,
    rotationDuration: 5,
  }).returning();
  
  console.log('Created past content:', pastContent.id);
  
  const result = await schedulingService.getActiveContentForTeacher(TEACHER1_ID, 'History');
  
  console.log('Result for past content:', result);
  
  // Should not return the past content
  const test = result.available === false || (result.data && (result.data as any).id !== pastContent.id);
  
  // Cleanup
  await db.delete(content).where(eq(content.id, pastContent.id));
  
  if (test) {
    console.log('✅ CHECK 5 PASSED: Past content is never returned');
  } else {
    console.log('❌ CHECK 5 FAILED: Past content was returned');
  }
  
  return test;
}

async function check6_PendingContentNotReturned() {
  console.log('\n=== CHECK 6: Pending Content Not Returned ===\n');
  
  // Create pending content
  const [pendingContent] = await db.insert(content).values({
    title: 'Pending Content Test',
    description: 'Content that is pending',
    subject: 'Geography',
    fileUrl: 'pending.png',
    fileType: 'png',
    fileSize: 1824,
    uploadedBy: TEACHER1_ID,
    status: 'pending',
    startTime: new Date(),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    rotationDuration: 5,
  }).returning();
  
  console.log('Created pending content:', pendingContent.id);
  
  const result = await schedulingService.getActiveContentForTeacher(TEACHER1_ID, 'Geography');
  
  console.log('Result for pending content:', result);
  
  // Should not return pending content
  const test = result.available === false || (result.data && (result.data as any).id !== pendingContent.id);
  
  // Cleanup
  await db.delete(content).where(eq(content.id, pendingContent.id));
  
  if (test) {
    console.log('✅ CHECK 6 PASSED: Pending content is never returned');
  } else {
    console.log('❌ CHECK 6 FAILED: Pending content was returned');
  }
  
  return test;
}

async function check7_SingleItemSubject() {
  console.log('\n=== CHECK 7: Single Item Subject (No Rotation) ===\n');
  
  // Science has only one item (content3)
  const results: string[] = [];
  for (let i = 0; i < 5; i++) {
    const result = await schedulingService.getActiveContentForTeacher(TEACHER1_ID, 'Science');
    if (result.available && result.data) {
      results.push((result.data as any).id);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const allSame = results.every(id => id === results[0]);
  console.log('5 calls for Science (single item):', results);
  console.log('All same:', allSame);
  
  if (allSame) {
    console.log('✅ CHECK 7 PASSED: Single item subject always returns same content');
  } else {
    console.log('❌ CHECK 7 FAILED: Single item subject is not consistent');
  }
  
  return allSame;
}

async function check8_MultiSubjectResponse() {
  console.log('\n=== CHECK 8: Multi-Subject Response ===\n');
  
  const result = await schedulingService.getActiveContentForTeacher(TEACHER1_ID);
  
  console.log('Result (no subject filter):', JSON.stringify(result, null, 2));
  
  const hasMaths = result.data && typeof result.data === 'object' && 'Maths' in result.data;
  const hasScience = result.data && typeof result.data === 'object' && 'Science' in result.data;
  
  console.log('Has Maths key:', hasMaths);
  console.log('Has Science key:', hasScience);
  
  if (hasMaths && hasScience) {
    console.log('✅ CHECK 8 PASSED: Multi-subject response returns both subjects');
  } else {
    console.log('❌ CHECK 8 FAILED: Multi-subject response is incorrect');
  }
  
  return hasMaths && hasScience;
}

async function main() {
  try {
    let contentIds;
    try {
      contentIds = await setupContent();
    } catch (setupError) {
      console.error('Setup failed:', setupError);
      // Try to continue with existing content
      console.log('Attempting to continue with existing content...');
    }
    
    const results = [];
    
    results.push(await check1_DeterministicOutput());
    results.push(await check2_RotationCycles());
    results.push(await check3_SubjectFilter());
    results.push(await check4_WrongTeacher());
    results.push(await check5_OutsideTimeWindow());
    results.push(await check6_PendingContentNotReturned());
    results.push(await check7_SingleItemSubject());
    results.push(await check8_MultiSubjectResponse());
    
    await cleanupContent();
    
    console.log('\n=== FINAL RESULTS ===\n');
    console.log('Total checks:', results.length);
    console.log('Passed:', results.filter(r => r).length);
    console.log('Failed:', results.filter(r => !r).length);
    
    const allPassed = results.every(r => r);
    if (allPassed) {
      console.log('\n✅ ALL CHECKS PASSED');
    } else {
      console.log('\n❌ SOME CHECKS FAILED');
    }
    
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('Error running verification:', error);
    process.exit(1);
  }
}

main();
