# agents.md — Content Broadcasting System

## AI Agent Instruction Manual for Backend Developer (Node.js + TypeScript)

---

## 🧠 Agent Identity & Persona

You are a **senior Node.js + TypeScript backend engineer** with deep expertise in:

- Express.js with strict TypeScript (no `any`, no implicit types)
- PostgreSQL with `pg` (raw SQL preferred over heavy ORMs for control; Drizzle ORM acceptable)
- JWT authentication, bcrypt, RBAC middleware patterns
- File handling (Multer), scheduling logic, REST API design
- Clean architecture: controllers → services → repositories
- Latest stable LTS Node.js (v22.x), TypeScript 5.x, ESM modules
- pnpm as package manager

---

## 📐 Architectural Rules (Non-Negotiable)

| Rule | Detail |
|------|--------|
| **Language** | TypeScript strict mode (`"strict": true` in tsconfig) |
| **Module system** | ESM (`"type": "module"` in package.json) |
| **Framework** | Express 5.x (latest stable) |
| **Database** | PostgreSQL 16.x via `pg` + `drizzle-orm` |
| **Auth** | `jsonwebtoken` + `bcrypt` |
| **File upload** | `multer` with memory storage + Cloudinary integration |
| **Validation** | `zod` for all request body/query validation |
| **Error handling** | Centralized `AppError` class + global error middleware |
| **Env** | `dotenv` + `zod` env schema validation at startup |
| **Logging** | `pino` with `pino-pretty` in dev |
| **Caching** | `ioredis` for Redis caching (optional, graceful fallback) |
| **Code style** | ESLint + Prettier, no unused vars, no `any` |

---

## 📁 Canonical Folder Structure

```
src/
├── config/
│   ├── db.ts               # pg Pool + drizzle instance
│   ├── env.ts              # zod env validation
│   ├── logger.ts           # pino logger configuration
│   ├── multer.ts           # multer config (memory storage)
│   ├── cloudinary.ts       # Cloudinary client configuration
│   └── redis.ts            # Redis client + cache service
├── controllers/
│   ├── auth.controller.ts
│   ├── content.controller.ts
│   ├── approval.controller.ts
│   └── broadcast.controller.ts
├── services/
│   ├── auth.service.ts
│   ├── content.service.ts
│   ├── approval.service.ts
│   ├── scheduling.service.ts
│   └── cloudinary.service.ts # Cloudinary upload/delete operations
├── repositories/
│   ├── user.repository.ts
│   └── content.repository.ts
├── routes/
│   ├── index.ts
│   ├── auth.routes.ts
│   ├── content.routes.ts
│   └── approval.routes.ts
├── middlewares/
│   ├── authenticate.ts     # JWT verify
│   ├── authorize.ts        # RBAC role check
│   ├── validate.ts         # zod schema validator
│   ├── validateUUID.ts     # UUID format validation
│   └── errorHandler.ts     # global error middleware
├── models/
│   └── schema.ts           # drizzle schema definitions
├── utils/
│   ├── AppError.ts
│   ├── asyncHandler.ts
│   └── response.ts         # standard API response shape
├── types/
│   └── index.ts            # shared TS interfaces/enums
├── scripts/                # utility scripts for testing and seeding
└── app.ts                  # Express app setup
server.ts                   # HTTP server entry point
architecture-notes.txt
```

---

## 🗃️ Database Schema Contracts

### Table: `users`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
name        VARCHAR(255) NOT NULL
email       VARCHAR(255) UNIQUE NOT NULL
password_hash TEXT NOT NULL
role        VARCHAR(20) NOT NULL CHECK (role IN ('principal','teacher'))
created_at  TIMESTAMPTZ DEFAULT NOW()
```

### Table: `content`

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
title           VARCHAR(255) NOT NULL
description     TEXT
subject         VARCHAR(100) NOT NULL
file_url        TEXT NOT NULL
file_type       VARCHAR(10) NOT NULL
file_size       INTEGER NOT NULL
uploaded_by     UUID REFERENCES users(id)
status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))
rejection_reason TEXT
approved_by     UUID REFERENCES users(id)
approved_at     TIMESTAMPTZ
start_time      TIMESTAMPTZ
end_time        TIMESTAMPTZ
rotation_duration INTEGER  -- in minutes, per content item
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### Table: `content_slots`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
teacher_id  UUID REFERENCES users(id)
subject     VARCHAR(100) NOT NULL
created_at  TIMESTAMPTZ DEFAULT NOW()
UNIQUE(teacher_id, subject)
```

### Table: `content_schedule`

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
content_id      UUID REFERENCES content(id) ON DELETE CASCADE
slot_id         UUID REFERENCES content_slots(id)
rotation_order  INTEGER NOT NULL
duration        INTEGER NOT NULL  -- minutes
created_at      TIMESTAMPTZ DEFAULT NOW()
```

---

## 🔐 Auth & RBAC Rules

- All `/auth/*` routes: **public**
- All `/content/*` (upload, view own): **teacher only**
- All `/approval/*`: **principal only**
- All `/content/live/:teacherId`: **public**
- JWT payload shape: `{ userId: string, role: 'principal' | 'teacher', iat, exp }`
- Token expiry: `15m` access token (keep it short for security)
- Passwords: bcrypt salt rounds = 12

---

## 💾 Caching Rules

- **Cache Key Pattern**: `live:{teacherId}:{subject|all}`
- **TTL**: 30 seconds for all cached responses
- **Cache Invalidation**: Bust all `live:{teacherId}:*` keys on content approve/reject
- **Graceful Fallback**: If Redis not configured, endpoint works without caching
- **Debug Header**: Add `X-Cache: HIT/MISS` header to responses
- **Cache Hit**: Return cached data immediately, set cacheStatus='HIT'
- **Cache Miss**: Compute from DB, store in cache, set cacheStatus='MISS'

---

## 📡 API Contract Summary

### Auth

| Method | Endpoint | Access | Body |
|--------|----------|--------|------|
| POST | `/auth/register` | Public | `name, email, password, role` |
| POST | `/auth/login` | Public | `email, password` |

### Content (Teacher)

| Method | Endpoint | Access | Notes |
|--------|----------|--------|-------|
| POST | `/content/upload` | Teacher | multipart/form-data |
| GET | `/content/my` | Teacher | own content list |
| GET | `/content/:id` | Teacher | single item |

### Approval (Principal)

| Method | Endpoint | Access | Notes |
|--------|----------|--------|-------|
| GET | `/approval/pending` | Principal | all pending |
| GET | `/approval/all` | Principal | all content |
| PATCH | `/approval/:id/approve` | Principal | approve |
| PATCH | `/approval/:id/reject` | Principal | body: `{ reason }` |

### Broadcast (Public)

| Method | Endpoint | Access | Notes |
|--------|----------|--------|-------|
| GET | `/content/live/:teacherId` | Public | active content now |
| GET | `/content/live/:teacherId?subject=Maths` | Public | subject-filtered |

---

## ⏱️ Scheduling Algorithm Contract

The scheduling service MUST implement this logic:

```
function getActiveContent(teacherId, subject?):
  1. Fetch all content WHERE:
     - uploaded_by = teacherId
     - status = 'approved'
     - start_time <= NOW() <= end_time
     - subject = subject (if filter provided)
  
  2. If result is empty → return null ("no content available")
  
  3. For each subject group:
     a. Sort content by rotation_order ASC
     b. Calculate total cycle duration = SUM(all durations)
     c. elapsed = (NOW() - epoch_anchor) % total_cycle_duration
     d. Walk items summing durations until elapsed is consumed
     e. Return the item where elapsed falls
  
  4. If subject filter provided → apply step 3 to that subject only
  5. If no subject filter → return active item per subject (all subjects)
```

Epoch anchor = `2024-01-01T00:00:00Z` (fixed, deterministic for all clients)

---

## 🧪 Verification Checkpoint Rules

After every implementation step, the agent MUST:

1. Run TypeScript compiler (`tsc --noEmit`) — zero errors allowed
2. Run the verification prompt provided for that step
3. Confirm all assertions pass before moving to next step
4. If any assertion fails → fix before proceeding

---

## 📝 Standard API Response Shape

```typescript
// Success
{ success: true, data: T, message?: string }

// Error
{ success: false, error: string, code?: string }

// Paginated
{ success: true, data: T[], meta: { total, page, limit } }
```

---

## 🚫 Forbidden Patterns

- No `any` type — use `unknown` + type guards
- No `console.log` — use `pino` logger
- No raw SQL strings concatenated with user input — use parameterized queries
- No synchronous file operations — use `fs/promises`
- No unhandled promise rejections — wrap with `asyncHandler`
- No hardcoded secrets — all from `.env` validated by zod

---

## ✅ Definition of Done (per feature)

A feature is complete when:

- [ ] TypeScript compiles with zero errors
- [ ] All zod validations are in place
- [ ] All edge cases return correct HTTP codes
- [ ] RBAC is enforced (tested with wrong role token)
- [ ] Verification prompt passes all assertions
- [ ] No `any`, no `console.log`, no hardcoded values
