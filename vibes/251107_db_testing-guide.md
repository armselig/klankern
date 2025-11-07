# Testing Database Schema Enhancements

This document explains how to test the database schema enhancements for security, audit, and GDPR compliance.

**Status:** CI/CD workflow has been triggered and is running. Tests will verify all schema enhancements.

## Test Infrastructure

### Test Database Setup

The schema enhancement tests require a PostgreSQL database with migrations applied. There are two approaches:

#### Approach 1: CI/CD with GitHub Actions (Recommended)

The GitHub Actions workflow (`.github/workflows/test.yml`) automatically:
1. Starts a PostgreSQL service container
2. Runs database migrations
3. Executes all tests

**This ensures tests always run against the correct schema.**

#### Approach 2: Local Testing

For local testing, you need to:

1. **Start the database:**
   ```bash
   pnpm run db:start
   # or
   podman-compose up -d db
   ```

2. **Run migrations:**
   ```bash
   pnpm run db:migrate
   ```

3. **Run tests:**
   ```bash
   pnpm test
   ```

### Test Database Configuration

Tests use the following environment variables (from `.env` or CI environment):

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=klankern_user
DB_PASSWORD=klankern_password
DB_NAME=klankern_db
```

## Schema Enhancement Tests

The schema enhancement tests (`test/nuxt/db/schema-enhancements.spec.ts`) validate:

### 1. Failed Login Tracking (4 tests)
- Field defaults and nullability
- Updating failed login counters
- Account locking timestamps

### 2. User Anonymization (3 tests)
- `anonymized_at` field functionality
- Data anonymization workflow
- GDPR right to be forgotten

### 3. Session Metadata Tracking (3 tests)
- IP address and user agent storage
- Last activity timestamp updates
- Device fingerprint tracking

### 4. Audit Log Table (4 tests)
- Audit entry creation with JSONB values
- System action logging (null user_id)
- Old/new value storage
- Index performance verification

### 5. User Consents Table (4 tests)
- Consent record creation
- Multiple consent types per user
- Consent revocation workflow
- Cascade deletion with user

### 6. Relations (2 tests)
- User to audit logs relation
- User to consents relation

**Total: 25 comprehensive tests**

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Specific Test File
```bash
pnpm test test/nuxt/db/schema-enhancements.spec.ts
```

### Run Tests in Watch Mode
```bash
pnpm test:watch
```

### Run Tests with UI
```bash
pnpm test:ui
```

## Troubleshooting

### Tests Fail with "relation does not exist"

**Cause:** Database migrations haven't been applied.

**Solution:**
```bash
pnpm run db:migrate
```

### Tests Fail with "connection refused"

**Cause:** PostgreSQL database is not running.

**Solution:**
```bash
pnpm run db:start
# or
podman-compose up -d db
```

### Tests Fail with "column does not exist"

**Cause:** You may have an older migration applied. Schema has changed.

**Solution:**
1. Drop and recreate the database:
   ```bash
   podman-compose down -v
   podman-compose up -d db
   ```

2. Run migrations:
   ```bash
   pnpm run db:migrate
   ```

3. Optionally seed data:
   ```bash
   pnpm run db:seed
   ```

## CI/CD Pipeline

The GitHub Actions workflow runs on:
- Pull requests to `develop` or `main`
- Direct pushes to `develop` or `main`

### Workflow Steps:
1. ✅ Checkout code
2. ✅ Setup Node.js 22.17.0
3. ✅ Install pnpm 10.13.1
4. ✅ Install dependencies
5. ✅ Start PostgreSQL service
6. ✅ Run database migrations
7. ✅ Run all tests
8. ✅ Run type checking

### Viewing Test Results

Test results are visible in:
- PR checks (status badge)
- Actions tab in GitHub
- PR conversation (detailed logs)

## Test Coverage

The schema tests validate:
- ✅ Schema field existence
- ✅ Default values
- ✅ Nullable fields
- ✅ Foreign key constraints
- ✅ Cascade deletion behavior
- ✅ Index creation
- ✅ JSONB storage
- ✅ Relations between tables

## Future Test Improvements

Potential enhancements:
- [ ] Integration tests for failed login logic
- [ ] E2E tests for GDPR data export
- [ ] Performance tests for audit log queries
- [ ] Test coverage reporting
- [ ] Snapshot testing for migration SQL

## References

- Main tests: `test/nuxt/db/schema-enhancements.spec.ts`
- CI workflow: `.github/workflows/test.yml`
- Schema definition: `server/db/schema.ts`
- Migration: `server/db/migrations/0005_flawless_demogoblin.sql`
