import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/content/00000000-0000-0000-0000-000000000000',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer invalid_token',
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Response:', data);
    console.log('\nChecking for stack trace...');
    if (data.includes('stack') || data.includes('at ') || data.includes('Error:')) {
      console.log('❌ Stack trace found in response');
    } else {
      console.log('✅ No stack trace in response');
    }
  });
});

req.on('error', (err) => {
  console.error('Error:', err.message);
});

req.end();
