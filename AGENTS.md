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
- **ALWAYS** use TypeScript in compliance with `tsconfig.json` files and `eslint` rules.
- Take care of type safety by ensuring types can be safely inferred or are defined in a (shared) type/interface.
- **Commit Messages**: MUST follow conventional commit guidelines. The first line/heading of the message is in all lowercase. If possible, always include a scope. In the message body, explain the changes with a focus on WHY they were made. Always flag breaking changes. Each commit message must first be presented to the user for approval.

## Test Users & Credentials

The database seed script creates the following default users:

### Admin User

- **Username:** `admin`
- **Email:** `admin@example.com`
- **Password:** `password123`

### Standard Test User (for E2E tests)

- **ID:** `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`
- **Username:** `testuser`
- **Email:** `user@example.com`
- **Password:** `password123`

## AI Agent Collaboration

- **Agent-Relevant Files**: Keep all files relevant for AI agents within the `./vibes/` directory. All filenames start with a datestamp prefix. Example: `YYMMDD_topic_brief-description.md`.
- **Knowledge Graph**: If the MCP server `memory` is available, proactively and autonomously read the graph at the beginning of each session and keep it updated and maintained as you go.
- **NEVER** assume! **ALWAYS** ask clarifying questions.
- **NEVER** (re-)start, stop etc. any services on your own. Managing containers and dev servers is solely in the domain of the user. You may ask the user at any time to perform such tasks on your behalf.

## Development Environment

The project supports two development setups:

### Containerized Development (Default)

- Both the Nuxt application and PostgreSQL database run in containers via `podman-compose`
- The Nuxt container name is `klankern_nuxt`, the database container is `klankern_db`
- Source code is bind-mounted, so file changes are reflected immediately
- **Important:** Do NOT start, stop, restart, or otherwise manage containers without explicit user approval

**Available Container Scripts:**

- `pnpm run dev:container`: Start all services
- `pnpm run dev:container:build`: Rebuild and start all services
- `pnpm run dev:container:stop`: Stop all containers
- `pnpm run dev:container:restart`: Restart Nuxt container
- `pnpm run dev:container:logs`: View Nuxt logs
- `pnpm run dev:container:shell`: Open shell in container
- `pnpm run db:migrate:container`: Run migrations in container
- `pnpm run db:seed:container`: Seed database in container

For ad-hoc commands: `podman exec klankern_nuxt pnpm run <script-name>`

### Traditional Local Development

- Nuxt runs locally on the host machine
- Only PostgreSQL runs in a container
- Standard `pnpm run <script-name>` commands work directly
- `pnpm run db:start`: Start database container
- `pnpm run db:stop`: Stop database container

## Further reading

- [Initial project plan](./vibes/PROJECT.md)
