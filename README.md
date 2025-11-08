# 🏡 Klankern: Your Family's Digital Hub

Welcome to Klankern, a Progressive Web App (PWA) designed to bring families closer and keep them organized! 🚀 This project aims to provide a central, intuitive platform for managing shared tasks, appointments, and notes, fostering seamless collaboration and simplifying daily family life.

![Nuxt.js](https://img.shields.io/badge/Nuxt.js-4.x-00DC82?style=for-the-badge&logo=nuxt.js&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.x-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.44.x-F3722C?style=for-the-badge&logo=drizzle&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.x-F69220?style=for-the-badge&logo=pnpm&logoColor=white)

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

You can set up your development environment in two ways: **fully containerized** (recommended for consistency) or **traditional local setup** (for more control).

### Option 1: Fully Containerized Development (Recommended)

This setup runs both the Nuxt application and PostgreSQL database in containers, ensuring a consistent environment across all developers.

1. **Install Tools:**
    - Ensure you have `podman` and `podman-compose` installed on your system.

2. **Environment Variables:**
    - Copy the example environment file:

        ```bash
        cp .env.example .env
        ```

    - Open `.env` and update the values as needed. The default values work out-of-the-box for containerized development.

3. **Start All Services:**
    - Build and start both the database and Nuxt application containers:

        ```bash
        pnpm run dev:container
        ```

        Or with forced rebuild:

        ```bash
        pnpm run dev:container:build
        ```

    - The first build may take a few minutes as dependencies are installed inside the container.

4. **Run Database Migrations:**
    - Execute migrations inside the running Nuxt container:

        ```bash
        pnpm run db:migrate:container
        ```

5. **Access the Application:**
    - Your app will be available at `http://localhost:3000`
    - The database is accessible at `localhost:5432`

6. **Useful Container Commands:**
    - View logs: `pnpm run dev:container:logs`
    - Restart Nuxt container: `pnpm run dev:container:restart`
    - Open shell in container: `pnpm run dev:container:shell`
    - Stop all containers: `pnpm run dev:container:stop`
    - Seed database: `pnpm run db:seed:container`

**Note:** Your source code is bind-mounted into the container, so changes you make locally are immediately reflected in the running application with hot-reloading enabled.

### Option 2: Traditional Local Development

This setup runs the Nuxt application locally on your machine while using a containerized PostgreSQL database.

1. **Install Tools:**
    - Ensure you have `pnpm` (our preferred package manager) and `podman` (for database containerization) installed on your system.
    - We recommend using Node.js LTS. Check `.nvmrc` for the recommended version.

2. **Install Dependencies:**

    ```bash
    pnpm install
    ```

3. **Environment Variables:**
    - Copy the example environment file:

        ```bash
        cp .env.example .env
        ```

    - Open `.env` and ensure `DB_HOST=localhost` (default for local development).

4. **Start Database:**
    - Spin up only the PostgreSQL database container:

        ```bash
        pnpm run db:start
        ```

    - Run database migrations to set up the schema:

        ```bash
        pnpm run db:migrate
        ```

    - To stop the database: `pnpm run db:stop`

## 👨‍💻 Development

### Container Management Scripts

These scripts simplify working with the containerized environment:

- `pnpm run dev:container`: Start all services (database + Nuxt)
- `pnpm run dev:container:build`: Rebuild and start all services
- `pnpm run dev:container:stop`: Stop all containers
- `pnpm run dev:container:restart`: Restart the Nuxt container only
- `pnpm run dev:container:logs`: View live Nuxt application logs
- `pnpm run dev:container:shell`: Open an interactive shell in the Nuxt container
- `pnpm run db:start`: Start only the PostgreSQL database container
- `pnpm run db:stop`: Stop the PostgreSQL database container
- `pnpm run db:migrate:container`: Run database migrations inside the container
- `pnpm run db:seed:container`: Seed the database inside the container

### Application Development Scripts

**For Traditional Local Setup:**

- `pnpm run dev`: Starts the development server with hot-reloading. Your app will typically be available at `http://localhost:3000`.
- `pnpm run build`: Builds the application for production deployment.
- `pnpm run preview`: Previews the production build locally.
- `pnpm run db:generate`: Generates new Drizzle ORM migrations after schema changes in `server/db/schema.ts`.
- `pnpm run db:migrate`: Applies pending database migrations.
- `pnpm run db:seed`: Seeds the database with initial data (if a seed file exists).

**For Containerized Setup:**

The Nuxt dev server runs automatically inside the container when you start it with `pnpm run dev:container`. All development scripts are available through the dedicated container commands listed above. For ad-hoc commands not covered by npm scripts, use:

- `podman exec klankern_nuxt pnpm run <script-name>`

## 🧪 Testing

We use [Vitest](https://vitest.dev/) with [`@nuxt/test-utils`](https://nuxt.com/docs/getting-started/testing) for comprehensive testing.

### Test Environments

- **`unit`**: For simple, isolated unit tests that run in a standard Node.js environment. Place these in `test/unit/`.
- **`nuxt`**: For tests requiring the Nuxt runtime context (e.g., components, composables, server utilities). **Place these in `test/nuxt/`.**

### Running Tests

**Traditional Local Setup:**

- `pnpm run test`: Runs all tests (unit and Nuxt).
- `pnpm run test:nuxt`: Runs only tests in the `nuxt` environment.
- `pnpm run test:ui`: Starts the Vitest UI for interactive test development.

**Containerized Setup:**

- `podman exec klankern_nuxt pnpm run test`: Runs all tests inside the container.
- `podman exec klankern_nuxt pnpm run test:nuxt`: Runs only tests in the `nuxt` environment.
- `podman exec klankern_nuxt pnpm run test:ui`: Starts the Vitest UI (accessible at the exposed port).

## 🗄️ Database Management

- **Schema Definition:** Located in `server/db/schema.ts`.

**Traditional Local Setup:**

- **Generate Migrations:** After modifying `server/db/schema.ts`, run `pnpm run db:generate` to create a new migration file.
- **Apply Migrations:** To apply pending migrations to your database, use `pnpm run db:migrate`.
- **Seed Database:** Populate the database with initial test data using `pnpm run db:seed`.

**Containerized Setup:**

- **Generate Migrations:** `podman exec klankern_nuxt pnpm run db:generate`
- **Apply Migrations:** `pnpm run db:migrate:container`
- **Seed Database:** `pnpm run db:seed:container`

## 🧹 Linting and Formatting

Maintain code quality and consistency with:

- `pnpm run lint`: Lints the entire codebase to catch errors and style violations.
- `pnpm run lint:fix`: Automatically fixes linting issues where possible.
- `pnpm run format`: Formats the entire codebase using Prettier.

## 📜 Version Control

- **Commit Messages:** Please adhere to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for all commit messages. This helps with automated changelog generation and understanding project history.
- **Branches**:
    - **NEVER** push to `main` directly! It is the production branch. Only PRs from `develop` are allowed to go into `main`.
    - All development happens in `develop`.
    - If a task is more complex or might introduce breaking changes, it will be handled in a separate branch derived from `develop`. Naming convention: `type/brief-task-description`. Examples: `feature/add-pwa-functionality`, `bugfix/repair-broken-event-bus`. A PR to merge into `develop` is required.

## 🔑 Default Admin Login

For local development and testing, you can use the following credentials:

- **Email:** `test@example.com`
- **Password:** `password123`

## 🔑 Default Test User Login

For E2E testing and general user-level feature development, you can use the following credentials:

- **Email:** `user@example.com`
- **Password:** `password123`

## ✍️ Coding Guidelines

To ensure a consistent, maintainable, and high-quality codebase, please follow these guidelines:

### General

- **Naming Conventions:** Function and method names should clearly describe their purpose (e.g., `createUser`, `fetchProductById`), avoiding generic names like `handleData`.
- **Documentation:** Add JSDoc/TSDoc comments to explain the _why_ behind a function's existence or complex implementation details. The _how_ should be clear from the code itself.
- **Typing:** Always use proper TypeScript typing and share types/interfaces across the project for consistency.
- **Component IDs:** Use BEM-inspired naming for component IDs (e.g., `component-name__element-name`) to prevent conflicts.
- **Separation of Concerns:** Keep presentational logic separate from business logic. UI components should not directly handle API calls or complex data manipulation.
- **Exports:** Prefer explicit named exports over default exports.

### Frontend Specific

- **Progressive Enhancement:** When building components, start with semantic HTML (WCAG compliant) first. Add JavaScript/TypeScript functionality next. Address CSS/styles only when necessary, focusing on functionality before aesthetics.

### Project-Specific Nuxt Guidelines

- **Server-Side Logging:** Always use the `Winston` logger for server-side logging. Direct `console.log` usage is prohibited on the server.
- **Client-Side Logging:** Always use the `useLogger` composable for client-side logging. Direct `console.log` usage is prohibited in the frontend.
- **Authentication:** We use `nuxt-security` and `nuxt-auth-utils`. Server-side utilities like `setUserSession` are auto-imported in the `server/` directory. Login/logout logic is handled by the `useAuth` composable.

---

Happy Coding! 🚀
