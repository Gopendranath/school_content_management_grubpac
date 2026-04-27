import FormData from 'form-data';
import { readFile } from 'fs/promises';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/v1';

async function testUpload() {
  console.log('=== Testing Upload API ===');

  // Login as teacher
  console.log('1. Logging in as teacher...');
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

  const loginData = await loginRes.json() as { data: { token: string } };
  const token = loginData.data.token;
  console.log('✓ Login successful');

  // Upload file
  console.log('2. Uploading file...');
  const form = new FormData();
  const imageBuffer = await readFile('test.jpg');
  form.append('file', imageBuffer, 'test.jpg');
  form.append('title', 'Test Cloudinary Upload');
  form.append('subject', 'Maths');
  form.append('description', 'Testing Cloudinary integration');

  const uploadRes = await fetch(`${API_BASE}/content/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!uploadRes.ok) {
    console.error('Upload failed', await uploadRes.text());
    return;
  }

  const uploadData = await uploadRes.json() as { data: { fileUrl: string } };
  console.log('✓ Upload successful');
  console.log('Content:', JSON.stringify(uploadData.data, null, 2));
  console.log('File URL:', uploadData.data.fileUrl);

  // Check if it's a Cloudinary URL
  if (uploadData.data.fileUrl.includes('cloudinary')) {
    console.log('✓ File uploaded to Cloudinary');
  } else {
    console.log('✓ File uploaded to local storage (fallback)');
  }
}

testUpload().catch(console.error);
