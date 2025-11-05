# Containerized Development Environment - Implementation Guide

**Date:** 2025-11-05
**Approach:** Simple Multi-Container (Approach 2)
**Goal:** Run PostgreSQL + Nuxt Dev Server in Podman containers with full HMR support

## Overview

This guide implements a containerized development environment where:

- PostgreSQL database runs in a container (already configured)
- Nuxt application runs in a container
- Local files are edited on the host
- HMR (Hot Module Replacement) works seamlessly
- Everything starts with a single `podman-compose up` command

### Why This Approach?

- **Reproducible:** Every team member has identical environment
- **Isolated:** No conflicts with other projects or system Node.js
- **Convenient:** Single command to start all services
- **HMR Preserved:** Edit files locally, see changes instantly
- **Minimal Complexity:** Builds on existing Podman setup

## Prerequisites

- Podman and podman-compose installed
- Current PostgreSQL container working
- Git repository cloned locally
- `.env` file configured with database credentials

## Step-by-Step Implementation

### Step 1: Create `.dockerignore`

Create this file to exclude unnecessary files from the container context:

**File:** `.dockerignore`

```
# Dependencies
node_modules/
pnpm-lock.yaml

# Build outputs
.nuxt/
.output/
dist/

# Logs
log/
*.log

# Environment
.env
.env.*

# Git
.git/
.gitignore

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Tests
coverage/
test-results/

# Misc
*.md
vibes/
```

**Why:** Reduces build context size and prevents overwriting container-generated files.

---

### Step 2: Create Development Dockerfile

Create a Dockerfile specifically for development with hot reload support:

**File:** `Dockerfile.dev`

```dockerfile
# Use Node.js 22 Alpine for minimal size
FROM node:22-alpine

# Install pnpm globally
RUN npm install -g pnpm@10.13.1

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package.json pnpm-workspace.yaml ./

# Install dependencies
# --frozen-lockfile ensures reproducible builds
# --prefer-offline speeds up builds
RUN pnpm install --frozen-lockfile --prefer-offline

# Copy all application code
# Note: Most of this will be overridden by bind mount in compose
COPY . .

# Expose Nuxt dev server port
EXPOSE 3000

# Start development server
# Uses pnpm for consistency with local development
CMD ["pnpm", "dev"]
```

**Key Points:**

- **Alpine Linux:** Smaller image size (~150MB vs ~1GB for full Node.js)
- **Layer Caching:** Dependencies installed before code copy for faster rebuilds
- **pnpm Version:** Matches the version specified in package.json
- **CMD vs ENTRYPOINT:** Using CMD allows easy override in compose.yaml

---

### Step 3: Update Podman Compose Configuration

Update the existing `compose.yaml` to add the Nuxt service:

**File:** `compose.yaml`

```yaml
services:
    # Existing PostgreSQL service
    db:
        build:
            context: ./docker/postgres
            dockerfile: Dockerfile
        container_name: klankern_db
        environment:
            POSTGRES_DB: ${DB_NAME:-klankern_db}
            POSTGRES_USER: ${DB_USER:-klankern_user}
            POSTGRES_PASSWORD: ${DB_PASSWORD:-klankern_password}
        ports:
            - "5432:5432"
        volumes:
            - db_data:/var/lib/postgresql/data
        networks:
            - klankern_network
        healthcheck:
            test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-klankern_user}"]
            interval: 10s
            timeout: 5s
            retries: 5

    # New Nuxt application service
    nuxt:
        build:
            context: .
            dockerfile: Dockerfile.dev
        container_name: klankern_nuxt
        ports:
            - "3000:3000"
        environment:
            # Database connection (points to db service)
            DB_HOST: db
            DB_PORT: 5432
            DB_NAME: ${DB_NAME:-klankern_db}
            DB_USER: ${DB_USER:-klankern_user}
            DB_PASSWORD: ${DB_PASSWORD:-klankern_password}
            # Node environment
            NODE_ENV: development
        volumes:
            # Bind mount source code for live editing
            - ./app:/app/app:z
            - ./server:/app/server:z
            - ./shared:/app/shared:z
            - ./public:/app/public:z
            - ./test:/app/test:z
            # Bind mount configuration files
            - ./nuxt.config.ts:/app/nuxt.config.ts:z
            - ./tsconfig.json:/app/tsconfig.json:z
            - ./drizzle.config.ts:/app/drizzle.config.ts:z
            - ./vitest.config.ts:/app/vitest.config.ts:z
            - ./.env:/app/.env:z
            # Named volume for node_modules (CRITICAL for performance)
            - nuxt_node_modules:/app/node_modules
            # Exclude build outputs from bind mount
            - /app/.nuxt
            - /app/.output
            - /app/log
        networks:
            - klankern_network
        depends_on:
            db:
                condition: service_healthy
        # Restart policy for development
        restart: unless-stopped
        # Use host IPC namespace for better file watching performance
        ipc: host

networks:
    klankern_network:
        driver: bridge

volumes:
    db_data:
    nuxt_node_modules:
```

**Configuration Breakdown:**

**Volumes Strategy:**

- **Bind Mounts (`:z` flag):** Source code directories mounted for live editing
    - `:z` flag: Required for SELinux systems to allow container access
- **Named Volume:** `nuxt_node_modules` prevents performance issues with node_modules
- **Anonymous Volumes:** `.nuxt`, `.output`, `log` excluded to prevent conflicts

**Networking:**

- **DB_HOST:** Set to `db` (service name in compose, Docker's DNS resolves it)
- **Port 3000:** Exposed for browser access and HMR WebSocket

**Dependencies:**

- **depends_on + healthcheck:** Ensures database is ready before Nuxt starts
- **service_healthy:** Waits for PostgreSQL to accept connections

**Performance:**

- **ipc: host:** Improves file watching performance on some systems

---

### Step 4: Configure Nuxt for Container Development

Update Nuxt configuration to enable proper HMR through containers:

**File:** `nuxt.config.ts`

Add or update the `vite` section:

```typescript
export default defineNuxtConfig({
    // ... existing configuration ...

    // Configure Nuxt dev server to listen on all interfaces
    devServer: {
        host: "0.0.0.0",
        port: 3000,
    },

    vite: {
        server: {
            // Listen on all network interfaces (required for container access)
            host: "0.0.0.0",

            // Use the standard port
            port: 3000,

            // Don't try other ports if 3000 is taken
            strictPort: true,

            // File watching configuration for containers
            watch: {
                // Use polling instead of native file system events
                // Required for Docker/Podman on macOS and some Linux setups
                usePolling: true,

                // Check for changes every 100ms (balance between responsiveness and CPU)
                interval: 100,

                // Follow symbolic links
                followSymlinks: true,

                // Ignore node_modules and build outputs
                ignored: ["**/node_modules/**", "**/.nuxt/**", "**/.output/**"],
            },

            // HMR (Hot Module Replacement) configuration
            hmr: {
                // Use WebSocket protocol
                protocol: "ws",

                // Browser connects to localhost (outside container)
                host: "localhost",

                // Port for HMR WebSocket
                port: 3000,

                // Client connects to the same path
                clientPort: 3000,
            },
        },

        // Optimize dependency pre-bundling
        optimizeDeps: {
            // Force re-optimize on server restart if needed
            force: false,
        },
    },

    // ... rest of configuration ...
});
```

**Configuration Explained:**

**devServer Configuration:**

- **devServer.host: '0.0.0.0'** - Configures Nuxt's dev server to listen on all network interfaces
- **devServer.port: 3000** - Explicitly sets the port (matches Vite server port)
- Required in addition to `vite.server.host` for container accessibility
- Without this, Nuxt may only bind to IPv6 localhost (::1) inside the container

**vite.server.host: '0.0.0.0'**

- Makes Vite server accessible from outside the container
- Default `localhost` only binds to loopback interface inside container
- Required for host machine to connect to containerized server

**usePolling: true**

- Enables polling-based file watching instead of native fs.watch
- Native file system events don't cross Docker/Podman volume boundaries reliably
- Trade-off: Slightly higher CPU usage (~2-5%) for reliable HMR

**interval: 100**

- Check files every 100ms for changes
- Lower = faster HMR but more CPU usage
- Higher = less CPU but slower change detection
- 100ms is a good balance (10 checks per second)

**HMR host Configuration:**

- **server.host: '0.0.0.0'** - Container listens on all interfaces
- **hmr.host: 'localhost'** - Browser connects to localhost:3000
- These must differ: server binds inside container, client connects from host

---

### Step 5: Update Package.json Scripts

Add convenient scripts for containerized workflow:

**File:** `package.json`

```json
{
    "scripts": {
        "dev": "nuxt dev",
        "dev:container": "podman-compose up",
        "dev:container:build": "podman-compose up --build",
        "dev:container:stop": "podman-compose down",
        "dev:container:restart": "podman-compose restart nuxt",
        "dev:container:logs": "podman-compose logs -f nuxt",
        "dev:container:shell": "podman exec -it klankern_nuxt sh",

        "db:start": "podman-compose up db -d",
        "db:stop": "podman-compose stop db",
        "db:migrate": "drizzle-kit migrate",
        "db:generate": "drizzle-kit generate",
        "db:seed": "tsx server/db/seed.ts",
        "db:migrate:container": "podman exec -it klankern_nuxt pnpm db:migrate",
        "db:seed:container": "podman exec -it klankern_nuxt pnpm db:seed",

        "build": "nuxt build",
        "generate": "nuxt generate",
        "preview": "nuxt preview",
        "postinstall": "nuxt prepare",

        "lint": "eslint .",
        "lint:fix": "eslint . --fix",
        "test": "vitest",
        "test:ui": "vitest --ui",
        "typecheck": "nuxt typecheck"
    }
}
```

**New Scripts Explained:**

- **dev:container** - Start all services (DB + Nuxt)
- **dev:container:build** - Rebuild containers and start (use after dependency changes)
- **dev:container:stop** - Stop all services and remove containers
- **dev:container:restart** - Restart just the Nuxt service (useful for config changes)
- **dev:container:logs** - Follow Nuxt container logs in real-time
- **dev:container:shell** - Open shell inside Nuxt container for debugging
- **db:migrate:container** - Run migrations from inside container
- **db:seed:container** - Seed database from inside container

---

### Step 6: Environment Variables

Ensure your `.env` file has the correct database host for container networking:

**File:** `.env`

```env
# Database Configuration
# Use 'db' as host when running in containers
# Use 'localhost' as host when running locally
DB_HOST=db
DB_PORT=5432
DB_NAME=klankern_db
DB_USER=klankern_user
DB_PASSWORD=klankern_password

# Node Environment
NODE_ENV=development

# ... other environment variables ...
```

**Important:** When running locally (not containerized), temporarily change `DB_HOST=localhost`.

**Pro Tip:** Create separate env files:

- `.env.container` - With `DB_HOST=db`
- `.env.local` - With `DB_HOST=localhost`
- Use symbolic link: `ln -sf .env.container .env`

---

## Building and Running

### First Time Setup

```bash
# 1. Build the containers
pnpm run dev:container:build

# Wait for build to complete and services to start
# You should see:
# - PostgreSQL initialization
# - pnpm installing dependencies
# - Nuxt dev server starting
```

### Daily Development Workflow

```bash
# Start all services
pnpm run dev:container

# In another terminal, watch logs
pnpm run dev:container:logs

# Open browser to http://localhost:3000
```

### Stopping Services

```bash
# Stop all services (keeps containers)
pnpm run dev:container:stop

# Or use Ctrl+C if running in foreground
```

---

## Testing HMR

### Test 1: Component Hot Reload

1. Start containers: `pnpm run dev:container`
2. Open http://localhost:3000
3. Edit a Vue component in `app/components/`
4. Save the file
5. **Expected:** Browser updates without full reload (< 500ms)

### Test 2: Server API Hot Reload

1. Edit an API endpoint in `server/api/`
2. Save the file
3. **Expected:** Nuxt rebuilds server (may take 1-2s), then reloads

### Test 3: Configuration Changes

1. Edit `nuxt.config.ts`
2. **Expected:** Full dev server restart (automated)
3. Alternatively, manually restart: `pnpm run dev:container:restart`

---

## Troubleshooting

### Issue: HMR Not Working (Changes Not Reflected)

**Symptoms:** File changes don't trigger updates in browser

**Solutions:**

1. **Verify polling is enabled:**

    ```typescript
    // nuxt.config.ts
    vite: {
      server: {
        watch: {
          usePolling: true,
          interval: 100,
        }
      }
    }
    ```

2. **Check file permissions (SELinux):**

    ```bash
    # Verify :z flag is on volume mounts in compose.yaml
    # Or disable SELinux temporarily to test
    sudo setenforce 0
    ```

3. **Verify browser WebSocket connection:**
    - Open browser DevTools → Network → WS
    - Should see `ws://localhost:3000/` connected
    - If "failed", check `hmr.host` in nuxt.config.ts

4. **Restart containers:**
    ```bash
    pnpm run dev:container:stop
    pnpm run dev:container:build
    ```

---

### Issue: High CPU Usage

**Symptoms:** 100% CPU usage on a single core

**Solutions:**

1. **Increase polling interval:**

    ```typescript
    watch: {
      usePolling: true,
      interval: 300, // Changed from 100ms to 300ms
    }
    ```

2. **Reduce watched files:**

    ```typescript
    watch: {
        ignored: [
            "**/node_modules/**",
            "**/.nuxt/**",
            "**/.output/**",
            "**/test/**", // Add this if not actively testing
            "**/vibes/**",
        ];
    }
    ```

3. **Check for file watching loops:**
    ```bash
    # View container logs for repeated rebuilds
    pnpm run dev:container:logs
    ```

---

### Issue: Database Connection Failed

**Symptoms:** `Error: connect ECONNREFUSED` or `Connection timeout`

**Solutions:**

1. **Verify DB_HOST is set to `db`:**

    ```bash
    # Inside container
    podman exec -it klankern_nuxt env | grep DB_HOST
    # Should show: DB_HOST=db
    ```

2. **Check database is ready:**

    ```bash
    # View database logs
    podman-compose logs db

    # Test connection from Nuxt container
    podman exec -it klankern_nuxt ping db
    ```

3. **Verify depends_on healthcheck:**
    ```bash
    # Check service health
    podman ps
    # STATUS column should show "(healthy)" for db
    ```

---

### Issue: Port Already in Use

**Symptoms:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions:**

1. **Stop existing process:**

    ```bash
    # Find process using port 3000
    lsof -i :3000

    # Kill the process
    kill -9 <PID>
    ```

2. **Stop old containers:**

    ```bash
    podman ps -a
    podman rm -f klankern_nuxt
    ```

3. **Change port (temporary):**
    ```yaml
    # compose.yaml
    ports:
        - "3001:3000" # Host:Container
    ```

---

### Issue: node_modules Not Found

**Symptoms:** `Cannot find module ...` errors

**Solutions:**

1. **Rebuild with --no-cache:**

    ```bash
    podman-compose build --no-cache
    pnpm run dev:container:build
    ```

2. **Remove named volume and rebuild:**

    ```bash
    podman-compose down -v
    podman volume rm klankern_nuxt_node_modules
    pnpm run dev:container:build
    ```

3. **Install dependencies manually:**
    ```bash
    pnpm run dev:container:shell
    # Inside container:
    pnpm install
    ```

---

### Issue: Slow File System Performance

**Symptoms:** Lag between file save and HMR (> 2 seconds)

**Solutions:**

1. **macOS: Use delegated consistency:**

    ```yaml
    # compose.yaml
    volumes:
        - ./app:/app/app:delegated,z
    ```

2. **Linux: Verify ipc: host is set:**

    ```yaml
    # compose.yaml
    services:
        nuxt:
            ipc: host
    ```

3. **Consider :cached flag for read-only mounts:**
    ```yaml
    # Only for files Nuxt doesn't write to
    - ./tsconfig.json:/app/tsconfig.json:cached,z
    ```

---

## Performance Tuning

### Optimal Polling Interval

Test different intervals to find your balance:

```typescript
// Responsive but CPU-intensive
interval: 50; // 20 checks/second, ~5-8% CPU

// Balanced (recommended)
interval: 100; // 10 checks/second, ~2-5% CPU

// Conservative
interval: 300; // 3.3 checks/second, ~1-2% CPU
```

### Volume Mount Optimization

```yaml
# Best performance: separate named volumes for generated content
volumes:
    - ./app:/app/app:z
    - ./server:/app/server:z
    - nuxt_node_modules:/app/node_modules
    - /app/.nuxt # Anonymous volume for Nuxt build output
    - /app/.output
```

### Reduce Build Time

```bash
# Use --parallel for faster pnpm installs
RUN pnpm install --frozen-lockfile --prefer-offline --parallel
```

---

## Team Onboarding

### For New Team Members

1. **Clone repository:**

    ```bash
    git clone <repo-url>
    cd klankern
    ```

2. **Copy environment file:**

    ```bash
    cp .env.example .env
    # Edit .env with local credentials
    ```

3. **Start development environment:**

    ```bash
    pnpm run dev:container:build
    ```

4. **Wait for services to start** (first time takes 3-5 minutes)

5. **Open browser:** http://localhost:3000

**That's it!** No Node.js, pnpm, or PostgreSQL installation needed locally.

---

### For Team Members Without Podman

**macOS:**

```bash
brew install podman podman-compose
podman machine init
podman machine start
```

**Linux:**

```bash
# Debian/Ubuntu
sudo apt-get install podman podman-compose

# Fedora/RHEL
sudo dnf install podman podman-compose
```

**Windows:**

```powershell
# Using Chocolatey
choco install podman-desktop
# Or download from podman.io
```

---

## Workflow Comparison

### Before (Local Development)

```bash
# Terminal 1
pnpm db:start

# Terminal 2
pnpm dev

# Required: Node.js 22, pnpm, PostgreSQL client tools
```

### After (Containerized Development)

```bash
# Terminal 1 (everything)
pnpm dev:container

# Required: Only Podman
```

---

## Migration Path

### Running Both Modes

Keep both workflows available during transition:

**Local Development:**

```bash
# Update .env
DB_HOST=localhost

# Start only DB container
pnpm db:start

# Run Nuxt locally
pnpm dev
```

**Containerized Development:**

```bash
# Update .env
DB_HOST=db

# Start all containers
pnpm dev:container
```

---

## Next Steps

### Optional Enhancements

1. **Add Dev Container Support (VS Code)**
    - Create `.devcontainer/devcontainer.json`
    - Full IDE integration

2. **Add Debugging Configuration**
    - Expose Node.js debugger port
    - Configure VS Code launch.json

3. **Add Production Dockerfile**
    - Multi-stage build
    - Production-optimized image

4. **Add CI/CD Integration**
    - Use same containers in CI
    - Ensure parity with production

5. **Add Healthcheck to Nuxt Service**
    ```yaml
    healthcheck:
        test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000"]
        interval: 30s
        timeout: 10s
        retries: 3
    ```

---

## Resources

- **Vite HMR Docs:** https://vitejs.dev/guide/api-hmr.html
- **Nuxt Docker Docs:** https://nuxt.com/docs/getting-started/deployment#docker
- **Podman Compose:** https://github.com/containers/podman-compose
- **Dockerfile Best Practices:** https://docs.docker.com/develop/dev-best-practices/

---

## Summary

**What We Achieved:**

- ✅ Fully containerized development environment
- ✅ Hot Module Replacement working through containers
- ✅ Single command to start all services
- ✅ Local file editing with instant container updates
- ✅ Reproducible environment for all team members
- ✅ Minimal workflow disruption

**Commands to Remember:**

```bash
pnpm run dev:container        # Start everything
pnpm run dev:container:logs   # Watch logs
pnpm run dev:container:stop   # Stop everything
pnpm run dev:container:shell  # Debug inside container
```

**Next:** Test thoroughly, update team documentation, and migrate team members gradually.
