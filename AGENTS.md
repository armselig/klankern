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
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Linting & Formatting**: [Biome.js](https://biomejs.dev/)
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

-   `pnpm dev`: Starts the development server with hot-reloading.
-   `pnpm build`: Builds the application for production.
-   `pnpm generate`: Generates a static version of the site.
-   `pnpm preview`: Previews the production build locally.

## Database

The database schema is managed by Drizzle ORM.

-   **Schema Definition**: The database schema is defined in `server/db/schema.ts`.
-   **Run Migrations**: To apply migrations, run `pnpm db:migrate`.
-   **Generate Migrations**: After making changes to the schema in `server/db/schema.ts`, generate a new migration by running `pnpm db:generate`.

## Linting and Formatting

We use Biome.js for linting and formatting.

-   `pnpm lint`: Lints the entire codebase.
-   `pnpm format`: Formats the entire codebase.

## Version Control

-   **Commit Messages**: Please use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for all commit messages.

## AI Agent Collaboration

-   **Agent-Relevant Files**: Keep all files relevant for AI agents within the `./vibes/` directory.
-   **Interaction Diary**: Proactively and autonomously maintain a time-stamped diary of our interactions in `./vibes/diary.md`.
