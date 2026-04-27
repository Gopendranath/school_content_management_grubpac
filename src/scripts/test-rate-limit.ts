import http from 'http';

async function testRateLimit() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  let successCount = 0;
  let rateLimitCount = 0;

  for (let i = 1; i <= 12; i++) {
    await new Promise<void>((resolve) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 429) {
            rateLimitCount++;
            console.log(`Request ${i}: ${res.statusCode} - Rate limited`);
          } else {
            successCount++;
            console.log(`Request ${i}: ${res.statusCode}`);
          }
          resolve();
        });
      });

      req.on('error', (err) => {
        console.error(`Request ${i} error:`, err.message);
        resolve();
      });

      req.write(JSON.stringify({ email: 'test@test.com', password: 'Test123' }));
      req.end();
    });

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\nResults: ${successCount} successful, ${rateLimitCount} rate limited`);
  console.log('Expected: 10 successful, 2 rate limited (limit is 10 per 15min)');
}

testRateLimit();
