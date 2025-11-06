# GitHub Copilot Instructions for Klankern

This document provides instructions for GitHub Copilot coding agents working on the Klankern project.

## Project Overview

Klankern is a Progressive Web App (PWA) designed as a family's digital hub for managing shared tasks, appointments, and notes. It's built with modern technologies to provide a central, intuitive platform for family collaboration.

## Tech Stack

- **Frontend**: Nuxt.js (v4), Vue.js 3
- **Backend**: Nitro (integrated with Nuxt.js)
- **Database**: PostgreSQL 18.x with Drizzle ORM
- **Validation**: Zod
- **Testing**: Vitest with @nuxt/test-utils
- **Package Manager**: pnpm ^10.13.1
- **Node.js**: ^22.17.0 (LTS "jod" - see `.nvmrc`)
- **Linting & Formatting**: ESLint, Prettier
- **Containerization**: Podman with podman-compose

## Development Environment

The project supports two development setups:

### Containerized Development (Default)
- Both Nuxt and PostgreSQL run in containers
- Container names: `klankern_nuxt` (app), `klankern_db` (database)
- Source code is bind-mounted for hot-reloading
- **Important**: Do NOT start, stop, or restart containers without user approval

### Traditional Local Development
- Nuxt runs locally, PostgreSQL in container
- Standard pnpm commands work directly

## Essential Commands

### Development

**For Traditional Local Setup:**
```bash
pnpm install                 # Install dependencies
pnpm run dev                # Start development server (http://localhost:3000)
pnpm run build              # Build for production
pnpm run preview            # Preview production build
```

**For Containerized Setup:**
```bash
pnpm run dev:container            # Start all services
pnpm run dev:container:build      # Rebuild and start
pnpm run dev:container:stop       # Stop all containers
pnpm run dev:container:restart    # Restart Nuxt container
pnpm run dev:container:logs       # View logs
pnpm run dev:container:shell      # Open shell in container
```

### Database Management

**Traditional Local:**
```bash
pnpm run db:start           # Start database container
pnpm run db:stop            # Stop database container
pnpm run db:generate        # Generate migrations after schema changes
pnpm run db:migrate         # Apply pending migrations
pnpm run db:seed            # Seed database with test data
```

**Containerized:**
```bash
pnpm run db:migrate:container    # Run migrations in container
pnpm run db:seed:container       # Seed database in container
podman exec klankern_nuxt pnpm run db:generate  # Generate migrations
```

### Testing

```bash
pnpm run test               # Run all tests
pnpm run test:watch         # Run tests in watch mode
pnpm run test:ui            # Open Vitest UI
```

**Test Structure:**
- `test/nuxt/` - Tests requiring Nuxt runtime (components, composables, server)
- `test/e2e/` - End-to-end tests

### Linting and Code Quality

```bash
pnpm run lint               # Lint entire codebase
pnpm run lint:fix           # Auto-fix linting issues (also formats with Prettier)
pnpm run typecheck          # Run TypeScript type checking
```

**Always run linting and type checking before committing changes.**

## Code Style Guidelines

### Naming Conventions

- **Files and Components**: Use kebab-case
  - ✅ `utility-file.ts`, `<my-component />`
  - ❌ `utility_file.ts`, `<MyComponent />`
- **Functions/Methods**: Use clear, descriptive names
  - ✅ `createUser`, `fetchProductById`
  - ❌ `handleData`, `doStuff`
- **Component IDs**: Use BEM-inspired naming
  - Example: `component-name__element-name`

### TypeScript

- **Always use TypeScript** in compliance with `tsconfig.json` and ESLint rules
- **Type Safety**: Ensure types can be safely inferred or explicitly defined
- **Shared Types**: Define in `./shared/types` (import via alias `#shared/types`)
- **No Any Types**: Avoid using `any`; use proper typing

### Code Organization

- **Auto-Imports**: Nuxt auto-imports are **DISABLED**. Always explicitly import what you need.
- **Path Aliases**: Always use custom path aliases defined in `nuxt.config.ts`
- **Separation of Concerns**: Keep presentation separate from business logic
  - API calls should be in Pinia stores or composables, not components
  - Use composables for reusable logic
- **Exports**: Prefer named exports over default exports

### Logging

- **Server-Side**: Always use Winston logger. Direct `console.log` is **prohibited**.
- **Client-Side**: Always use `useLogger` composable. Direct `console.log` is **prohibited**.

### Documentation

- Add JSDoc/TSDoc comments to explain the **why** behind complex logic
- The **how** should be clear from the code itself
- Don't add redundant comments that just repeat what the code does

## Project-Specific Guidelines

### Authentication
- Uses `nuxt-security` and `nuxt-auth-utils`
- Server-side utilities like `setUserSession` are auto-imported in `server/` directory
- Login/logout logic handled by `useAuth` composable

### Database Schema
- Located in `server/db/schema.ts`
- After modifying schema:
  1. Run `pnpm run db:generate` to create migration
  2. Run `pnpm run db:migrate` to apply migration
  3. Test thoroughly

### Progressive Enhancement
- Start with semantic HTML (WCAG compliant)
- Add JavaScript/TypeScript functionality
- Address CSS/styles last

## Test Users

The database seed script creates default test users:

### Admin User
- **Username**: `admin`
- **Email**: `admin@example.com`
- **Password**: `password123`

### Standard Test User (for E2E tests)
- **ID**: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`
- **Username**: `testuser`
- **Email**: `user@example.com`
- **Password**: `password123`

## Version Control

### Commit Messages
- **Must follow** [Conventional Commits](https://www.conventionalcommits.org/)
- Format: `type(scope): description`
- First line in **lowercase**
- Include scope when possible
- Explain **why** changes were made in the body
- Flag breaking changes with `BREAKING CHANGE:` footer

Examples:
```
feat(auth): add password reset functionality

Users can now request password reset via email.
This implements the forgot password flow.

fix(api): correct validation error for user creation

The email validation was too strict and rejected valid
international email addresses.
```

### Branching Strategy
- **`main`**: Production branch - **NEVER push directly**
- **`develop`**: Development branch - all work happens here
- **Feature branches**: `type/brief-task-description`
  - Examples: `feature/add-pwa-functionality`, `bugfix/repair-broken-event-bus`
  - Require PR to merge into `develop`

## Common Workflows

### Adding a New Feature
1. Create feature branch from `develop`
2. Implement feature with tests
3. Run `pnpm run lint:fix && pnpm run typecheck && pnpm run test`
4. Commit with conventional commit message
5. Create PR to `develop`

### Fixing a Bug
1. Create bugfix branch from `develop`
2. Write test that reproduces the bug
3. Fix the bug
4. Ensure test passes
5. Run full test suite and linting
6. Commit and create PR

### Modifying Database Schema
1. Update `server/db/schema.ts`
2. Generate migration: `pnpm run db:generate`
3. Review generated migration file
4. Apply migration: `pnpm run db:migrate`
5. Test changes thoroughly
6. Commit both schema and migration files

### Adding a New API Endpoint
1. Create endpoint in `server/api/` or `server/routes/`
2. Add Zod validation schema if needed
3. Implement business logic
4. Add tests in `test/nuxt/api/`
5. Test manually with the running app
6. Document any auth requirements

## File Structure

```
klankern/
├── app/                    # Nuxt app directory
│   ├── components/        # Vue components
│   ├── composables/       # Composables
│   ├── layouts/           # Layouts
│   ├── pages/             # Pages (auto-routing)
│   └── stores/            # Pinia stores
├── server/                # Server-side code
│   ├── api/              # API endpoints
│   ├── db/               # Database schema and utilities
│   ├── routes/           # Server routes
│   └── utils/            # Server utilities
├── shared/               # Shared code
│   └── types/           # Shared TypeScript types
├── test/                # Tests
│   ├── nuxt/           # Nuxt runtime tests
│   └── e2e/            # E2E tests
├── public/             # Static assets
└── vibes/              # Project documentation and plans
```

## Important Notes

- **Never assume** - always ask clarifying questions if requirements are unclear
- **Make minimal changes** - surgical, precise edits only
- **Test early and often** - run tests after each change
- **Follow existing patterns** - maintain consistency with existing code
- **Document complex logic** - help future developers understand your decisions

## Additional Resources

- Full coding guidelines: See `AGENTS.md`
- Project documentation: See `vibes/` directory
- README: See `README.md` for detailed setup instructions
