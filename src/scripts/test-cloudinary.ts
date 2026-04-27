import { readFile } from 'fs/promises';
import { cloudinaryService } from '../services/cloudinary.service.js';
import { logger } from '../config/logger.js';

async function testCloudinaryUpload() {
  logger.info('=== Testing Cloudinary Integration ===');

  // Read a test image
  const testImagePath = 'test.jpg';
  const buffer = await readFile(testImagePath);

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: buffer.length,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  const teacherId = 'test-teacher-123';

  try {
    logger.info('Test 1: Cloudinary upload with valid credentials');
    const cloudinaryResult = await cloudinaryService.uploadToCloudinary(mockFile, teacherId);
    logger.info('✓ Cloudinary upload successful', { url: cloudinaryResult.url, publicId: cloudinaryResult.publicId });
    
    // Test deletion
    logger.info('Test 2: Cloudinary delete');
    await cloudinaryService.deleteFromCloudinary(cloudinaryResult.publicId);
    logger.info('✓ Cloudinary delete successful');
  } catch (error) {
    logger.error('✗ Cloudinary test failed', { error });
  }

  try {
    logger.info('Test 3: Local storage fallback');
    const localResult = await cloudinaryService.uploadToLocal(mockFile, teacherId);
    logger.info('✓ Local storage upload successful', { filename: localResult });
  } catch (error) {
    logger.error('✗ Local storage test failed', { error });
  }

  logger.info('=== Tests Complete ===');
}

testCloudinaryUpload().catch(console.error);
