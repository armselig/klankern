<!--
This file is for AI agents. It provides instructions and guidelines for interacting with this project.
For more information, see https://agents.md/
-->

# Klankern Agent Guidelines

This document provides instructions for AI agents to work with the Klankern project. Please follow these guidelines to ensure smooth collaboration.

## Code Style Guidelines

- **NEVER** commit or push to Git without explicit approval.
- File names and custom elements/components use Kebab-case. DO: `utility-file.ts`, `<my-component />`. DON'T: `utility_file.ts`, `<MyComponent />`.
- **[Nuxt Auto-Imports](https://nuxt.com/docs/4.x/guide/concepts/auto-imports)** have been disabled.
- Always make use of the **custom path aliases** defined in `nuxt.config.ts`.
- **Schemas and types** should be shared and reused across the project via files in `./shared/types` (imported via alias `#shared/types`).
- **Separation of concerns**: Do not mix presentation with business logic. Example: API calls should be handled by a Pinia store, not by a component. Use composables.

## Test Users & Credentials

The database seed script creates the following default users:

**1. Admin User**

- **Username:** `admin`
- **Email:** `admin@example.com`
- **Password:** `password123`

**2. Standard Test User (for E2E tests)**

- **ID:** `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`
- **Username:** `testuser`
- **Email:** `user@example.com`
- **Password:** `password123`

## Testing Guidelines & Learnings for AI Agents

This section documents specific challenges and solutions encountered during testing in the Klankern project environment.

### General Testing Principles

- Be aware of the context in which a script runs (Node.js vs. Nuxt server) for path alias resolution.

### Nuxt Test Environment Specifics

- **Nuxt Path Aliases in Non-Nuxt Contexts:**
    - Problem: Server-side scripts (like `seed.ts`) and Vitest unit tests (in `test/unit/`) do not resolve Nuxt path aliases (`#server`, `~`, `~~`).
    - Solution: Use relative paths (`../`) in these contexts.
- **Drizzle Schema Inspection:**
    - Problem: Low-level inspection of Drizzle schema constraints (e.g., via `getTableConfig`) is unreliable or undocumented for testing.
    - Solution: Focus on testing the existence of table/column objects and the higher-level Drizzle `relations` objects.

### End-to-End (E2E) Testing with `@nuxt/test-utils`

- **Environment Setup:**
    - Ensure `playwright-core` is installed (`pnpm add -D playwright-core`).
    - Install Playwright browser binaries: `pnpm exec playwright install` (or `pnpm exec playwright-core install`).
    - Use `await setup({ browser: true, dev: true });` in the `describe` block to enable browser testing and hot-reloading.
- **Authentication:**
    - Use a test-only API endpoint (`POST /api/__test__/login`) to programmatically log in users. This endpoint must be guarded by `process.env.NODE_ENV === 'test'`.
    - Use `$fetch` for API calls within E2E tests, as it correctly resolves the test server's base URL. Avoid `page.request.post` for relative URLs.
- **Known Issue: Nuxt Test Server File Discovery:**
    - Problem: The `@nuxt/test-utils` test server does not reliably discover new API route files created _during_ a test session, even with `dev: true`.
    - Status: Unresolved. This issue currently blocks the E2E test from functioning.

## AI Agent Collaboration

- **Agent-Relevant Files**: Keep all files relevant for AI agents within the `./vibes/` directory.
- **Knowledge Graph**: If the MCP server `memory` is available, proactively and autonomously read the graph at the beginning of each session and keep it updated and maintained as you go.
- **NEVER** assume! **ALWAYS** ask clarifying questions.

## Known AI issues in the project

- Agents have no idea how to write proper Vitest tests in a Nuxt v4 environment. They screw up, get stuck in a loop and completely ignore documentation even if presented on a silver platter.
- Agents are completely lost with the current ESLint setup and how to fix linting errors, especially regarding imports and types.

## Further reading

- [`README.md`](./README.md)
- [Initial project plan](./vibes/PROJECT.md)
