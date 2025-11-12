<!--
Suggestions for improvement:
- Add a screenshot or GIF of the application in action below.
- Update the placeholder badges with actual URLs from your CI/CD provider.
-->

# 🏡 Klankern: Your Family's Digital Hub

Welcome to Klankern, a Progressive Web App (PWA) designed to bring families closer and keep them organized! 🚀 This project aims to provide a central, intuitive platform for managing shared tasks, appointments, and notes, fostering seamless collaboration and simplifying daily family life.

<!-- BADGE PLACEHOLDERS - UPDATE WITH ACTUAL URLS -->
<p align="left">
    <img src="https://img.shields.io/badge/Nuxt.js-4.x-00DC82?style=for-the-badge&logo=nuxt.js&logoColor=white" alt="Nuxt.js">
    <img src="https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/PostgreSQL-18.x-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/Drizzle_ORM-0.44.x-F3722C?style=for-the-badge&logo=drizzle&logoColor=white" alt="Drizzle ORM">
    <img src="https://img.shields.io/badge/pnpm-10.x-F69220?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm">
</p>

## ✨ Features

- **Family Group Management:** Create, edit, and delete family groups.
- **Task Management:** Keep track of shared responsibilities.
- **Appointment Scheduling:** Coordinate family events and appointments.
- **Shared Notes:** A central place for important information.
- **User Management:** Admin panel for managing users and roles.
- **Robust Authentication:** Secure login and session management.
- **Family Ownership Transfer:** Transfer ownership of a family to another user.
- **Email Verification:** Secure your account with email verification.
- **Soft-Delete:** Data is never truly deleted, allowing for easy recovery.

## 🛠️ Tech Stack

Klankern is built with modern, efficient, and developer-friendly technologies:

- **Frontend:** [Nuxt.js](https://nuxt.com/) (v4), [Vue.js](https://vuejs.org/)
- **Backend:** [Nitro](https://nitro.unjs.io/) (integrated with Nuxt.js)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Validation:** [Zod](https://zod.dev/)
- **Logging:** [Winston](https://github.com/winstonjs/winston)
- **Testing:** [Vitest](https://vitest.dev/), [@nuxt/test-utils](https://nuxt.com/docs/getting-started/testing)
- **Package Manager:** [pnpm](https://pnpm.io/)
- **Linting & Formatting:** [Prettier](https://prettier.io/), [ESLint](https://eslint.org/)
- **Git Hooks:** [Lefthook](https://github.com/evilmartians/lefthook)
- **Containerization:** [Podman](https://podman.io/)

## 🚀 Getting Started

This guide will help you set up your development environment. We recommend the **fully containerized** approach for consistency.

### Prerequisites

- **Podman & Podman-Compose:** For container management.
- **pnpm:** Our preferred package manager.
- **Node.js:** We recommend the LTS version specified in `.nvmrc`.

### Default Test Users

The database seed script creates the following default users:

- **Admin User:**
    - **Email:** `admin@example.com`
    - **Password:** `password123`
- **Standard Test User (for E2E tests):**
    - **Email:** `user@example.com`
    - **Password:** `password123`

### Setup: Fully Containerized (Recommended)

This setup runs both the Nuxt application and PostgreSQL database in containers.

1. **Environment Variables:**
   Copy the example environment file and update it if needed. The defaults are configured for this setup.

    ```bash
    cp .env.example .env
    ```

2. **Start Services:**
   Build and start the containers. The first build may take a few minutes.

    ```bash
    pnpm run dev:container
    ```

    To force a rebuild, use `pnpm run dev:container:build`.

3. **Run Database Migrations:**
   Execute migrations inside the running Nuxt container.

    ```bash
    pnpm run db:migrate:container
    ```

4. **Access the Application:**
    - **App:** `http://localhost:3000`
    - **Database:** `localhost:5432`

Your source code is bind-mounted, so local changes will trigger hot-reloading in the container.

### Setup: Traditional Local Development

This setup runs Nuxt locally and uses a container for the PostgreSQL database.

1. **Install Dependencies:**

    ```bash
    pnpm install
    ```

2. **Environment Variables:**
   Copy the `.env.example` file and ensure `DB_HOST=localhost`.

    ```bash
    cp .env.example .env
    ```

3. **Start Database & Migrate:**

    ```bash
    pnpm run db:start
    pnpm run db:migrate
    ```

4. **Start Development Server:**

    ```bash
    pnpm run dev
    ```

## 👨‍💻 Development Scripts

All `pnpm run` scripts can be executed directly in a local setup. For a containerized setup, prefix commands with `podman exec klankern_nuxt`, or use the dedicated container scripts.

### Container Management

- `pnpm run dev:container`: Start all services (DB + Nuxt).
- `pnpm run dev:container:build`: Rebuild and start all services.
- `pnpm run dev:container:stop`: Stop all containers.
- `pnpm run dev:container:restart`: Restart the Nuxt container.
- `pnpm run dev:container:logs`: View Nuxt application logs.
- `pnpm run dev:container:shell`: Open a shell inside the Nuxt container.
- `pnpm run db:start` / `db:stop`: Start/stop the database container only.

### Database & Application

- `pnpm run dev`: Start the Nuxt dev server.
- `pnpm run build`: Build the application for production.
- `pnpm run db:generate`: Create a new migration from schema changes.
- `pnpm run db:migrate`: Apply pending migrations.
- `pnpm run db:seed`: Seed the database with test data.
- `pnpm run test`: Run all unit and Nuxt tests.
- `pnpm run lint`: Check for linting errors.
- `pnpm run format`: Format the codebase with Prettier.

## 🧪 Testing

We use [Vitest](https://vitest.dev/) with [`@nuxt/test-utils`](https://nuxt.com/docs/getting-started/testing).

- **`unit`**: For isolated unit tests (`test/unit/`).
- **`nuxt`**: For tests requiring the Nuxt runtime context (`test/nuxt/`).

**Run tests locally:**

- `pnpm run test`: Runs all tests.
- `pnpm run test:nuxt`: Runs only Nuxt environment tests.
- `pnpm run test:ui`: Opens the Vitest UI.

**Run tests in container:**

- `podman exec klankern_nuxt pnpm run test`

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Open an Issue:** Discuss the change you wish to make.
2. **Fork & Branch:** Create a new branch for your feature or bugfix.
3. **Develop:** Adhere to the [Coding Guidelines](#-coding-guidelines) and [Version Control](#-version-control) practices.
4. **Submit a Pull Request:** Ensure your PR is well-documented and references the original issue.

For more detailed instructions, especially for AI agents, please see [AGENTS.md](./AGENTS.md).

## ✍️ Coding Guidelines

- **Naming:** Use descriptive names (e.g., `createUser`) and avoid generics.
- **Documentation:** Add JSDoc/TSDoc to explain the _why_ of your code.
- **Typing:** Use TypeScript and shared types for consistency.
- **Separation of Concerns:** Keep business logic out of UI components.
- **Exports:** Prefer named exports over default exports.
- **Logging:** Use the `Winston` logger on the server and the `useLogger` composable on the client. No `console.log`!

## 🗄️ Version Control

- **Commits:** Follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.
- **Branches:**
    - `main`: Production branch. Do not push directly.
    - `develop`: Main development branch. All feature branches merge into this.
    - `feature/*` or `bugfix/*`: Create branches from `develop` for new work.

---

Happy Coding! 🚀
