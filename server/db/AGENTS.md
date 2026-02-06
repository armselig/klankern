# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-06
**Commit:** 363356d
**Branch:** main

## OVERVIEW

Database schema and utilities for the Klankern application using Drizzle ORM.

## STRUCTURE

```
./server/db/
├── schema.ts         # Database schema definition
├── seed.ts           # Database seeding script
└── migrations/       # Database migration scripts
```

## WHERE TO LOOK

| Task              | Location                | Notes                                              |
| ----------------- | ----------------------- | -------------------------------------------------- |
| Schema Definition | `server/db/schema.ts`   | Full database schema with tables, enums, relations |
| Seeding           | `server/db/seed.ts`     | Script to populate database with initial data      |
| Migrations        | `server/db/migrations/` | Migration files for database schema changes        |

## CONVENTIONS

- **UUID v7**: All primary keys use UUID v7 for better performance and sorting
- **Database Modeling**: Clear relationships between tables with proper constraints
- **Indexing**: All commonly queried fields are properly indexed
- **Soft Deleting**: Implemented with `deleted_at` fields for audit and recovery
- **GDPR Compliance**: Data anonymization and consent tracking
- **Enums**: All enum values are defined in a centralized location for consistency

## ANTI-PATTERNS (THIS PROJECT)

- **Never** directly query the database outside of Drizzle ORM
- **Never** hardcode database connection details
- **Never** forget to add proper indexes on frequently queried fields
- **Never** skip soft-delete implementation for important tables

## UNIQUE STYLES

- **Schema Flexibility**: Modular schema design with clear relationships
- **Performance**: UUID v7 primary keys optimized for performance and sorting
- **Security**: Database constraints and validation for preventing data inconsistencies
- **Audit Trail**: Full audit logging for all changes
- **Compliance**: GDPR and data retention requirements implemented at schema level
