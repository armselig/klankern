# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-06
**Commit:** 363356d
**Branch:** main

## OVERVIEW

Server-side code for the Klankern application, including API endpoints, database schema and server utilities.

## STRUCTURE

```
./server/
├── api/              # API endpoints with routes
├── db/               # Database schema and utilities
├── routes/           # Server routes
└── utils/            # Server utilities
```

## WHERE TO LOOK

| Task                  | Location               | Notes                                                   |
| --------------------- | ---------------------- | ------------------------------------------------------- |
| Authentication API    | `server/api/auth/`     | Handles login, logout, and verification flows           |
| Family Management API | `server/api/families/` | Group management and family-specific features           |
| Admin Management API  | `server/api/admin/`    | Admin panel endpoints for user and role management      |
| Database Schema       | `server/db/schema.ts`  | Full schema using Drizzle ORM with UUID v7 primary keys |

## CONVENTIONS

- **Database**: Uses Drizzle ORM with UUID v7 primary keys
- **API Design**: Follows REST conventions for CRUD operations
- **Type Safety**: All API endpoints use TypeScript with Zod validation
- **Security**: Session management with nuxt-auth-utils, secure password handling
- **Error Handling**: Consistent error responses with specific HTTP status codes

## ANTI-PATTERNS (THIS PROJECT)

- **Never** make direct database connections outside Drizzle ORM context
- **Never** skip Zod validation on API endpoints
- **Never** hardcode sensitive values like passwords or API keys
- **Never** assume user permissions without proper checks

## UNIQUE STYLES

- **Database**: UUID v7 primary keys for better performance and sorting
- **Security**: Robust session management with nuxt-auth-utils
- **Validation**: Uses Zod for API request and response validation
- **Error Logging**: Winston logger for detailed server-side error tracking

## COMMANDS

```bash
# Database
pnpm run db:migrate           # Apply migrations
pnpm run db:seed              # Seed database
pnpm run db:generate          # Generate new migration from schema changes
```
