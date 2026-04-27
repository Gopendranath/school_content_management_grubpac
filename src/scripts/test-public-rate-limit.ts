import http from 'http';

async function testPublicRateLimit() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/content/live/b508e140-8949-42ae-9f56-d06e8b3009fe',
    method: 'GET',
  };

  let successCount = 0;
  let rateLimitCount = 0;

  for (let i = 1; i <= 102; i++) {
    await new Promise<void>((resolve) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 429) {
            rateLimitCount++;
            if (i <= 105) {
              console.log(`Request ${i}: ${res.statusCode} - Rate limited`);
            }
          } else {
            successCount++;
          }
          resolve();
        });
      });

      req.on('error', (err) => {
        console.error(`Request ${i} error:`, err.message);
        resolve();
      });

      req.end();
    });
  }

  console.log(`\nResults: ${successCount} successful, ${rateLimitCount} rate limited`);
  console.log('Expected: 100 successful, 2 rate limited (limit is 100 per 15min)');
}

testPublicRateLimit();
