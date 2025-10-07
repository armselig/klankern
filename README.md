# 🏡 Klankern: Your Family's Digital Hub

Welcome to Klankern, a Progressive Web App (PWA) designed to bring families closer and keep them organized! 🚀 This project aims to provide a central, intuitive platform for managing shared tasks, appointments, and notes, fostering seamless collaboration and simplifying daily family life.

## ✨ Features

- **Family Group Management:** Create, edit, and delete family groups.
- **Task Management:** Keep track of shared responsibilities.
- **Appointment Scheduling:** Coordinate family events and appointments.
- **Shared Notes:** A central place for important information.
- **User Management:** Admin panel for managing users and roles.
- **Robust Authentication:** Secure login and session management.

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

Follow these steps to get your development environment up and running:

1.  **Install Tools:**
    - Ensure you have `pnpm` (our preferred package manager) and `podman` (for database containerization) installed on your system.
    - We recommend using Node.js LTS. Check `.nvmrc` for the recommended version.

2.  **Install Dependencies:**

    ```bash
    pnpm install
    ```

3.  **Environment Variables:**
    - Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    - Open `.env` and update the values as needed. This typically includes database connection strings and authentication secrets.

4.  **Start Database:**
    - Spin up the PostgreSQL database container using `podman-compose`:
        ```bash
        podman-compose up -d
        ```
    - Run database migrations to set up the schema:
        ```bash
        pnpm run db:migrate
        ```

## 👨‍💻 Development

Here are the essential scripts for local development:

- `pnpm run dev`: Starts the development server with hot-reloading. Your app will typically be available at `http://localhost:3000`.
- `pnpm run build`: Builds the application for production deployment.
- `pnpm run preview`: Previews the production build locally.
- `pnpm run db:generate`: Generates new Drizzle ORM migrations after schema changes in `server/db/schema.ts`.
- `pnpm run db:seed`: Seeds the database with initial data (if a seed file exists).

## 🧪 Testing

We use [Vitest](https://vitest.dev/) with [`@nuxt/test-utils`](https://nuxt.com/docs/getting-started/testing) for comprehensive testing.

### Test Environments

- **`unit`**: For simple, isolated unit tests that run in a standard Node.js environment. Place these in `test/unit/`.
- **`nuxt`**: For tests requiring the Nuxt runtime context (e.g., components, composables, server utilities). **Place these in `test/nuxt/`.**

### Running Tests

- `pnpm run test`: Runs all tests (unit and Nuxt).
- `pnpm run test:nuxt`: Runs only tests in the `nuxt` environment.
- `pnpm run test:ui`: Starts the Vitest UI for interactive test development.

## 🗄️ Database Management

- **Schema Definition:** Located in `server/db/schema.ts`.
- **Generate Migrations:** After modifying `server/db/schema.ts`, run `pnpm run db:generate` to create a new migration file.
- **Apply Migrations:** To apply pending migrations to your database, use `pnpm run db:migrate`.

## 🧹 Linting and Formatting

Maintain code quality and consistency with:

- `pnpm run lint`: Lints the entire codebase to catch errors and style violations.
- `pnpm run lint:fix`: Automatically fixes linting issues where possible.
- `pnpm run format`: Formats the entire codebase using Prettier.

## 📜 Version Control

- **Commit Messages:** Please adhere to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for all commit messages. This helps with automated changelog generation and understanding project history.

## 🔑 Default Admin Login

For local development and testing, you can use the following credentials:

- **Email:** `test@example.com`
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
- **Client-Side Logging:** `console.log` is permitted _only_ within the `useLogger` composable for client-side logging.
- **Nuxt Auto-Imports:**
    - **NEVER** explicitly import from `~/shared/types`. These types are globally available.
    - For other auto-imported items (e.g., composables), **ALWAYS** use the `#imports` virtual alias if explicit import is needed (e.g., `import { useUserSession } from '#imports';`).
- **Authentication:** We use `nuxt-security` and `nuxt-auth-utils`. Server-side utilities like `setUserSession` are auto-imported in the `server/` directory. Login/logout logic is handled by the `useAuth` composable.

---

Happy Coding! 🚀
