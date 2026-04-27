import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/v1';

async function testCache() {
  console.log('=== Testing Redis Caching ===\n');

  // First, get a teacher ID (we'll use teacher1 from seed)
  console.log('1. Getting teacher ID...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'teacher1@school.com',
      password: 'Teacher@123',
    }),
  });

  if (!loginRes.ok) {
    console.error('Login failed', await loginRes.text());
    return;
  }

  const loginData = await loginRes.json() as { data: { user: { id: string } } };
  const teacherId = loginData.data.user.id;
  console.log(`✓ Teacher ID: ${teacherId}\n`);

  // First request - should be cache MISS
  console.log('2. First request (expected: MISS)...');
  const start1 = Date.now();
  const res1 = await fetch(`${API_BASE}/content/live/${teacherId}`);
  const time1 = Date.now() - start1;
  const cache1 = res1.headers.get('X-Cache');
  console.log(`Response time: ${time1}ms`);
  console.log(`X-Cache header: ${cache1 || '(not set)'}`);
  console.log(`Status: ${res1.status}\n`);

  // Second request - should be cache HIT (within 30s)
  console.log('3. Second request within 30s (expected: HIT)...');
  const start2 = Date.now();
  const res2 = await fetch(`${API_BASE}/content/live/${teacherId}`);
  const time2 = Date.now() - start2;
  const cache2 = res2.headers.get('X-Cache');
  console.log(`Response time: ${time2}ms`);
  console.log(`X-Cache header: ${cache2 || '(not set)'}`);
  console.log(`Status: ${res2.status}\n`);

  // Verification
  console.log('=== Verification ===');
  if (cache1 === 'MISS' || cache1 === null) {
    console.log('✓ First request was a cache MISS (or no cache configured)');
  } else {
    console.log('✗ First request was not a cache MISS');
  }

  if (cache2 === 'HIT') {
    console.log('✓ Second request was a cache HIT');
    if (time2 < 5) {
      console.log('✓ Cache hit response time < 5ms');
    } else {
      console.log(`⚠ Cache hit response time ${time2}ms (expected < 5ms)`);
    }
  } else if (cache2 === 'MISS' || cache2 === null) {
    console.log('⚠ Second request was a cache MISS (Redis may not be configured)');
  } else {
    console.log(`✗ Unexpected cache status: ${cache2}`);
  }

  console.log('\n=== Test Complete ===');
}

testCache().catch(console.error);
