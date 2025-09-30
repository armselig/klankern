<!--
This file is for AI agents. It provides instructions and guidelines for interacting with this project.
For more information, see https://agents.md/
-->

# Klankern Agent Guidelines

This document provides instructions for AI agents to work with the Klankern project. Please follow these guidelines to ensure smooth collaboration.

## Project Overview

Klankern is a Progressive Web App (PWA) designed to help families stay organized and connected. It provides a central hub for managing shared tasks, appointments, and notes, fostering collaboration and simplifying daily family life.

## Tech Stack

- **Frontend**: [Nuxt.js](https://nuxt.com/), [Vue.js](https://vuejs.org/)
- **Backend**: [Nitro](https://nitro.unjs.io/) (integrated with Nuxt.js)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Validation**: [Zod](https://zod.dev/)
- **Logging**: [Winston](https://github.com/winstonjs/winston)
- **Testing**: [Vitest](https://vitest.dev/), [@nuxt/test-utils](https://nuxt.com/docs/getting-started/testing)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Linting & Formatting**: [Prettier](https://prettier.io/), [ESLint](https://eslint.org/)
- **Git Hooks**: [Lefthook](https://github.com/evilmartians/lefthook)
- **Containerization**: [Podman](https://podman.io/)

## Getting Started

To set up the development environment, follow these steps:

1.  **Install Tools**: Ensure you have `pnpm` and `podman` installed on your system.
2.  **Install Dependencies**: Run `pnpm install` to install all project dependencies.
3.  **Environment Variables**: Create a `.env` file by copying `.env.example` and update the values if necessary.
4.  **Start Database**: Run `podman-compose up -d` to start the PostgreSQL database container in the background.

## Development

The following scripts are available for development:

- `pnpm dev`: Starts the development server with hot-reloading.
- `pnpm build`: Builds the application for production.
- `pnpm generate`: Generates a static version of the site.
- `pnpm preview`: Previews the production build locally.

## Testing

This project uses [Vitest](https://vitest.dev/) with [`@nuxt/test-utils`](https://nuxt.com/docs/getting-started/testing) for unit and component testing.

### Test Environments

The configuration in `vitest.config.ts` sets up two distinct test projects:

1.  **`unit`**: For simple unit tests that run in a standard Node.js environment. Place these tests in the `test/unit/` directory.
2.  **`nuxt`**: For tests that require the Nuxt runtime context (e.g., testing components, composables, or server utilities). **Place these tests in the `test/nuxt/` directory.**

### Running Tests

- `pnpm test`: Runs all tests and exits.
- `pnpm test:nuxt`: Runs only the tests in the `nuxt` environment.
- `pnpm test:ui`: Starts the Vitest UI for interactive testing.

## Database

The database schema is managed by Drizzle ORM.

- **Schema Definition**: The database schema is defined in `server/db/schema.ts`.
- **Run Migrations**: To apply migrations, run `pnpm db:migrate`.
- **Generate Migrations**: After making changes to the schema in `server/db/schema.ts`, generate a new migration by running `pnpm db:generate`.

## Linting and Formatting

We use Prettier for formatting and ESLint for linting.

- `pnpm lint`: Lints the entire codebase.
- `pnpm format`: Formats the entire codebase.

## Version Control

- **Commit Messages**: Please use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for all commit messages.

## AI Agent Collaboration

- **Agent-Relevant Files**: Keep all files relevant for AI agents within the `./vibes/` directory.
- **Interaction Diary**: Proactively and autonomously maintain a time-stamped diary of our interactions in `./vibes/diary.md`.
- **Knowledge Graph**: If the MCP server `memory` is available, proactively and autonomously read the graph at the beginning of each session and keep it updated and maintained as you go.

## Default Admin Login

- **Email**: `test@example.com`
- **Password**: `password123`

## General Coding Guidelines

- Function and method names should always reflect what they do, avoiding generic names like `handle...`. Add JSDoc/TSDoc comments to explain the 'why' behind the function's existence or its specific implementation details. This is a general rule that applies to all projects and sessions.
- Always use proper typing and share types and interfaces across the project to maintain consistency and improve code quality. This is a general rule that applies to all projects and sessions.
- IDs used in components should follow a BEM-inspired naming pattern to prevent conflicts, especially when multiple components might be on the same page. For example, use `component-name__element-name`.
- Always separate the presentational layer from business logic. Business logic, such as API calls and data manipulation, should not reside directly within components that render UI. This is a general rule that applies to all projects and sessions.
- Always prefer explicit named exports over default exports. This is a general coding rule that applies to all projects and sessions.

## Frontend Development Guidelines

- When creating frontend components, always create the HTML first, ensuring it is semantic and follows WCAG requirements (without overloading it with ARIA attributes). Then add JavaScript/TypeScript functionality. Do not care about CSS/styles unless absolutely necessary. Use progressive enhancement.

## Project-Specific Guidelines

- For the Klankern project, always use the Winston logger instead of `console.log`. ESLint should be configured to flag `console.log` usage as an error.

## Authentication

- We are using `nuxt-security` and `nuxt-auth-utils` for authentication.
- Server-side utilities from `nuxt-auth-utils` (like `setUserSession`) are auto-imported in the `server/` directory and should not be imported explicitly.
- Password verification is done using `bcryptjs`.
- The login logic is handled by the `useAuthStore` Pinia store.
