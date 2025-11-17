# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-06
**Commit:** 363356d
**Branch:** main

## OVERVIEW

Klankern is a Progressive Web App (PWA) for families to manage shared tasks, appointments, and notes. It uses Nuxt.js 4, PostgreSQL with Drizzle ORM, and follows modern frontend/backend practices with TypeScript and strict type safety.

## STRUCTURE

```
./
├── app/              # Nuxt frontend components, composables, and pages
├── server/           # Server-side APIs, database schema, routes
├── shared/           # Shared TypeScript types and utilities
├── test/             # Unit and integration tests
├── vibes/            # Project documentation and decision logs
├── public/           # Static assets
└── package.json      # Project dependencies and scripts
```

## WHERE TO LOOK

| Task              | Location                                                 | Notes                                                   |
| ----------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| Authentication    | `app/composables/useAuth.ts`, `server/api/auth/`         | Uses nuxt-auth-utils for session management             |
| User Management   | `server/api/admin/users/`, `app/components/admin/users/` | Admin panel for managing users and roles                |
| Family Management | `server/api/families/`, `app/components/families/`       | Group management and family-specific features           |
| Database Schema   | `server/db/schema.ts`                                    | Full schema using Drizzle ORM with UUID v7 primary keys |

## CONVENTIONS

- **Naming**: Kebab-case for files and components (`utility-file.ts`, `<my-component />`)
- **Separation of Concerns**: API calls in stores/composables, not components
- **Path Aliases**: Using custom aliases in `nuxt.config.ts` (`#server`, `#shared`)
- **Type Safety**: Strict TypeScript usage with shared type definitions
- **Auto-Imports**: Disabled (explicit imports only)
- **Code Organization**: Frontend in `app/`, backend in `server/`

## ANTI-PATTERNS (THIS PROJECT)

- **Never** use `console.log` - use `useLogger` composables or Winston on server-side
- **Never** mix frontend logic with UI components directly - use composables
- **Never** make direct database connections outside Drizzle ORM context
- **Never** assume user permissions without proper checks

- **Agent-Relevant Files**: Keep all files relevant for AI agents within the `./vibes/` directory. All filenames start with a datestamp prefix. Example: `YYMMDD_topic_brief-description.md`.
- **Markdown files** must include YAML Frontmatter, which includes information about who created the file when, as well as who updated the file when.
- **Knowledge Graph**: If the MCP server `memory` is available, proactively and autonomously read the graph at the beginning of each session and keep it updated and maintained as you go.
    - **Graph Structure**: All entries in the knowledge graph MUST be connected or related to the base parent entity "Klankern project" (lowercase 'p'). This ensures a coherent, searchable graph structure.
    - **Avoid Duplicates**: Before creating new entities, always search for existing ones. Add observations to existing entities instead of creating duplicates. Never create new project entities—use the existing "Klankern project" parent.
    - **Naming Convention**: Use the exact entity names from the existing graph (e.g., "Klankern project", not "Klankern Project").
- **NEVER** assume! **ALWAYS** ask clarifying questions.
- **NEVER** (re-)start, stop etc. any services on your own. Managing containers and dev servers is solely in the domain of the user. You may ask the user at any time to perform such tasks on your behalf.

## UNIQUE STYLES

- **Database**: UUID v7 primary keys for better performance and sorting
- **Frontend**: Nuxt 4 with auto-routing and composables
- **Security**: Robust session management with nuxt-auth-utils
- **Testing**: Comprehensive unit and integration tests with Vitest

## COMMANDS

```bash
# Development
pnpm run dev                  # Start dev server
pnpm run dev:container        # Start with containerized environment

# Database
pnpm run db:migrate           # Apply migrations
pnpm run db:seed              # Seed database

# Testing
pnpm run test                 # Run all tests
pnpm run lint                 # Run linter
pnpm run typecheck            # Run TypeScript check

# Build & Deployment
pnpm run build                # Build for production
pnpm run generate             # Generate static site
```

## NOTES

- Project uses modern Nuxt 4 with TypeScript and server-side rendering
- PostgreSQL database schema designed with performance and GDPR compliance in mind
- Application follows a PWA-first approach for offline support
- Containerized development setup recommended for consistency
