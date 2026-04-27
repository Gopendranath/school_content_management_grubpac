# Content Broadcasting System

A backend system for managing educational content broadcasting with role-based access control, content approval workflow, and scheduled rotation.

## Tech Stack

- **Runtime**: Node.js 22.x (LTS)
- **Language**: TypeScript 5.x (strict mode)
- **Framework**: Express 5.x
- **Database**: PostgreSQL 16.x
- **ORM**: Drizzle ORM with `pg` driver
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Validation**: Zod
- **File Upload**: Multer (memory storage) + Cloudinary integration
- **Caching**: Redis (ioredis) for public endpoint caching
- **Logging**: Pino + pino-http
- **Security**: Helmet, CORS, express-rate-limit
- **Package Manager**: pnpm

## Architecture Overview

The system follows a clean three-layer architecture:

- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic (auth, content, approval, scheduling)
- **Repositories**: Handle database operations (users, content)
- **Middlewares**: Authentication, authorization, validation, error handling
- **Models**: Drizzle schema definitions

## Prerequisites

- Node.js 22.x or higher
- PostgreSQL 16.x or higher
- pnpm (recommended) or npm

## Setup & Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd content_broadcasting_system
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb cbs_db
   
   # Or use psql
   psql -c "CREATE DATABASE cbs_db;"
   ```

5. **Run database migrations**
   ```bash
   pnpm db:push
   ```

6. **Seed default users**
   ```bash
   pnpm db:seed
   ```

7. **Start the development server**
   ```bash
   pnpm dev
   ```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/cbs_db` |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | `your-super-secret-key-min-32-chars` |
| `JWT_EXPIRES_IN` | JWT token expiry time | `15m` |
| `MAX_FILE_SIZE_MB` | Maximum file upload size in MB | `10` |
| `UPLOAD_DIR` | Directory for local file uploads (fallback) | `uploads` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `your-api-key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `your-api-secret` |
| `REDIS_URL` | Redis connection URL (optional, for caching) | `redis://localhost:6379` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `http://localhost:3000,http://localhost:5173` |

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Compile TypeScript and generate OpenAPI docs |
| `pnpm start` | Start production server |
| `pnpm docs:generate` | Generate OpenAPI spec from Postman collection |
| `pnpm db:generate` | Generate Drizzle migration |
| `pnpm db:push` | Push schema to database |
| `pnpm db:seed` | Seed default users |
| `pnpm db:reset` | Reset database (drop all tables, rerun migration + seed) |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type check |

### Utility Scripts

The `src/scripts/` directory contains utility scripts for testing and maintenance:

- `seed.ts` - Seed default users (principal and teachers)
- `reset-db.ts` - Reset database (drop all tables, rerun migration + seed)
- `check-users.ts` - Check existing users in database
- `check-db.ts` - Verify database connection and schema
- `check-indexes.ts` - Verify database indexes
- `test-cloudinary.ts` - Test Cloudinary upload functionality
- `test-upload-api.ts` - Test content upload API endpoint
- `test-rate-limit.ts` - Test rate limiting on auth routes
- `test-public-rate-limit.ts` - Test rate limiting on public routes
- `test-cache.ts` - Test Redis caching on live endpoint
- `verify-scheduling.ts` - Verify scheduling algorithm logic
- `update-content-time.ts` - Update content time windows for testing
- `test-500-error.ts` - Test 500 error handling
- `migrate.ts` - Apply database migrations
- `apply-migration.ts` - Apply specific migration

Run scripts with: `npx tsx src/scripts/<script-name>.ts`

## Database Setup

The system uses Drizzle ORM for database migrations. The schema includes:

- **users**: User accounts with roles (principal/teacher)
- **content**: Educational content with approval status and scheduling
- **content_slots**: Teacher-subject mappings
- **content_schedule**: Content rotation schedule per slot

**For development** (push schema directly to database):
```bash
pnpm db:push
```

**For production** (generate migration files first):
```bash
pnpm db:generate
# Then apply migrations manually or via your deployment pipeline
```

Reset database (drops all tables, reruns migration + seed):
```bash
pnpm db:reset
```

## Running the Project

**Development mode** (with hot reload):
```bash
pnpm dev
```

**Production mode**:
```bash
pnpm build
pnpm start
```

**Type checking**:
```bash
pnpm typecheck
```

## API Documentation Summary

Base URL: `http://localhost:3000/api/v1`

### Auth Endpoints

| Method | Endpoint | Access | Body |
|--------|----------|--------|------|
| POST | `/auth/register` | Public | `{ name, email, password, role }` |
| POST | `/auth/login` | Public | `{ email, password }` |

**Password Requirements**: Minimum 8 characters, must contain uppercase, lowercase, number, and special character.

**Response** (login):
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "principal|teacher"
    }
  }
}
```

### Teacher Endpoints

| Method | Endpoint | Access | Notes |
|--------|----------|--------|-------|
| POST | `/content/upload` | Teacher | multipart/form-data with file |
| GET | `/content/my` | Teacher | List own content |
| GET | `/content/:id` | Teacher | Get single content item |

**Upload Body** (multipart/form-data):
- `file`: File (image/pdf, max 10MB)
- `title`: string (3-255 chars)
- `subject`: string (2-100 chars)
- `description`: string (optional)
- `start_time`: ISO datetime (optional)
- `end_time`: ISO datetime (optional)
- `rotation_duration`: number in minutes (1-60, optional)

### Principal Endpoints

| Method | Endpoint | Access | Notes |
|--------|----------|--------|-------|
| GET | `/approval/pending` | Principal | All pending content |
| GET | `/approval/all` | Principal | All content (any status) |
| PATCH | `/approval/:id/approve` | Principal | Approve content |
| PATCH | `/approval/:id/reject` | Principal | Body: `{ reason }` |

**Reject Body**:
```json
{
  "reason": "Minimum 10 characters explaining rejection"
}
```

### Public Endpoint

| Method | Endpoint | Access | Notes |
|--------|----------|--------|-------|
| GET | `/content/live/:teacherId` | Public | Get currently active content |
| GET | `/content/live/:teacherId?subject=Maths` | Public | Filter by subject |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "subject": "string",
      "fileUrl": "string",
      "fileType": "string",
      "uploadedBy": "uuid",
      "rotationDuration": number
    }
  ]
}
```

**Headers**:
- `X-Cache`: `HIT` or `MISS` - Indicates if response was served from Redis cache (requires REDIS_URL configured)

## Caching

The public broadcasting endpoint (`/content/live/:teacherId`) uses Redis caching to improve performance:

- **Cache Key**: `live:{teacherId}:{subject|all}`
- **TTL**: 30 seconds
- **Cache Invalidation**: Automatically invalidated when content is approved or rejected
- **Graceful Fallback**: If Redis is not configured, the endpoint works without caching
- **Debug Header**: `X-Cache: HIT/MISS` header indicates cache status

**Testing Cache**:
```bash
npx tsx src/scripts/test-cache.ts
```

## Scheduling Logic Explanation

The scheduling service implements a deterministic rotation algorithm:

1. **Fetch eligible content**: All approved content where `start_time <= NOW() <= end_time`
2. **Group by subject**: Content is organized by subject within each teacher's slots
3. **Calculate cycle duration**: Sum of all rotation durations for a subject
4. **Determine active item**:
   - Calculate elapsed time from epoch anchor (2024-01-01T00:00:00Z)
   - `elapsed = (NOW() - epoch_anchor) % total_cycle_duration`
   - Walk through items in rotation_order, summing durations until elapsed is consumed
5. **Return active item**: The content where elapsed time falls

**Example**: If content A (5min) and B (10min) rotate:
- Cycle = 15 minutes
- At 2min elapsed → Content A
- At 7min elapsed → Content B
- At 17min elapsed → Content A (cycle repeats)

## Default Seed Users

| Role | Email | Password |
|------|-------|----------|
| Principal | principal@school.com | Admin@123 |
| Teacher 1 | teacher1@school.com | Teacher@123 |
| Teacher 2 | teacher2@school.com | Teacher@123 |

## Assumptions & Design Decisions

1. **Epoch Anchor**: Fixed at `2024-01-01T00:00:00Z` for deterministic scheduling across all clients
2. **Token Expiry**: Short 15-minute access tokens for security (refresh tokens not implemented)
3. **File Storage**: Hybrid approach - Cloudinary for production (CDN-backed), local disk as fallback
4. **Content Slots**: One-to-one teacher-subject mapping (no multi-subject per teacher)
5. **Rotation**: Per-subject rotation, not per-content-item
6. **Rate Limiting**: 
   - Auth routes: 10 requests per 15 minutes
   - Public/content routes: 100 requests per 15 minutes
7. **Validation**: All inputs validated via Zod schemas with sanitization
8. **Error Handling**: Centralized error middleware with consistent response format
9. **Multer Storage**: Memory storage for streaming to Cloudinary, not disk storage

## Known Limitations

1. No refresh token implementation (users must re-login after 15 minutes)
2. No content editing/deletion capabilities (upload only)
3. Cloudinary configuration required for production file uploads
4. No content versioning or history
5. No bulk content approval
6. No analytics or usage tracking
7. No WebSocket support for real-time updates
8. No email notifications for approvals/rejections
9. Subject filtering is case-sensitive
10. No support for content categories or tags beyond subjects
11. No file deletion from Cloudinary when content is deleted
12. Cache response time depends on Redis network latency (cloud Redis like Upstash adds ~100-150ms)

## Optional Features Implemented

- [x] Rate limiting (auth and public routes)
- [x] Request ID tracking
- [x] Structured logging with Pino
- [x] Helmet security headers
- [x] CORS configuration
- [x] Input sanitization (HTML tag removal)
- [x] UUID validation middleware
- [x] Database indexes for performance
- [x] TypeScript strict mode
- [x] Environment variable validation with Zod
- [x] Centralized error handling
- [x] RBAC middleware (role-based access control)
- [x] File type validation
- [x] File size limits
- [x] Cloudinary integration for file uploads
- [x] Memory storage for Multer (streaming to Cloudinary)
- [x] Redis caching for public endpoint
- [x] Cache invalidation on content approval/rejection
- [x] Graceful fallback when Redis not configured
