# Development Container Setup: Issue & Resolution Report

**Date:** 2025-11-05

This document outlines the series of issues encountered, diagnosed, and resolved during the implementation of the containerized development environment as specified in `vibes/251105_containerize-dev-env.md`.

## Summary of Issues

The setup process was hindered by several distinct problems, ranging from initial configuration errors to suspected bugs in the `podman-compose` tool.

---

### Issue 1: Initial Build Failure (`ERR_PNPM_NO_LOCKFILE`)

- **Symptom:** The container build process failed during the `pnpm install` step.
- **Error:** `ERR_PNPM_NO_LOCKFILE: Cannot install with "frozen-lockfile" because pnpm-lock.yaml is absent.`
- **Root Cause:** The `pnpm-lock.yaml` file was not being copied into the Docker image. This was due to two errors originating from the implementation guide:
    1.  `pnpm-lock.yaml` was incorrectly listed in the `.dockerignore` file.
    2.  The `Dockerfile.dev` did not include `pnpm-lock.yaml` in its `COPY` instruction before running the install command.
- **Resolution:**
    1.  Removed the `pnpm-lock.yaml` entry from the `.dockerignore` file.
    2.  Updated the `COPY` command in `Dockerfile.dev` to include the lockfile: `COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./`.

---

### Issue 2: Podman State Corruption

- **Symptom:** After the first build attempt, subsequent `podman-compose` commands failed with errors indicating resource conflicts.
- **Errors:** `proxy already running`, `network is being used`, `container ... is running`.
- **Root Cause:** A previously failed `podman-compose` run left orphaned containers and networks, leading to an inconsistent state. An old container named `klankern_db_container` (from a previous `compose.yaml` version) was found to be still running.
- **Resolution:** The environment was forcibly cleaned by manually stopping and removing the conflicting container: `podman stop klankern_db_container && podman rm klankern_db_container`.

---

### Issue 3: Database Health Check Failure

- **Symptom:** The `db` container was running, but the `nuxt` container would not start. Logs from the `db` container showed a repeating fatal error.
- **Error:** `FATAL: database "klankern_user" does not exist.`
- **Root Cause:** The `healthcheck` command in `compose.yaml` was `pg_isready -U ${DB_USER}`. The `pg_isready` command defaults to using the username as the database name if one is not specified. The health check was incorrectly trying to connect to a database named `klankern_user`.
- **Resolution:** The `healthcheck.test` command in `compose.yaml` was modified to explicitly include the database name: `test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-klankern_user} -d ${DB_NAME:-klankern_db}"]`.

---

### Issue 4: YAML Parsing Error

- **Symptom:** `podman-compose` failed immediately with a Python traceback.
- **Error:** `yaml.parser.ParserError: while parsing a block collection... expected <block end>, but found '?'`.
- **Root Cause:** An incorrect `replace` operation had broken the YAML structure of `compose.yaml`. The `healthcheck` block was severely mis-indented, making the file invalid.
- **Resolution:** The `compose.yaml` file was corrected by fixing the indentation of the `db` service and the `healthcheck` block to conform to proper YAML syntax.

---

### Issue 5: `podman-compose` Fails to Find Service (YAML Indentation Error)

- **Symptom:** After all previous issues were fixed, the `db` service would start, but the `nuxt` service would not. Attempts to start or view logs for the `nuxt` service failed.
- **Error:** `WARNING:podman_compose:missing services [nuxt]`.
- **Initial Diagnosis:** Suspected to be a bug or caching issue in `podman-compose` (v1.5.0).
- **Actual Root Cause:** The `nuxt` service block in `compose.yaml` (lines 24-69) was indented with **4 spaces instead of 2 spaces**, making it a **child of the `db` service** rather than a sibling service at the same level. YAML parsers interpret indentation as hierarchy, so the `nuxt` service was never registered as a top-level service under `services:`.
- **Resolution:** Corrected the indentation of the entire `nuxt` service block by reducing indentation from 4 spaces to 2 spaces. After this fix, `podman-compose config` correctly showed both `db` and `nuxt` as sibling services, and both containers started successfully.

---

### Issue 6: Nuxt Server Not Accessible from Host

- **Symptom:** The `nuxt` container started successfully and logs showed "Nuxt dev server running", but attempting to access `http://localhost:3000` from the host machine failed with connection refused.
- **Root Cause:** Inside the container, Nuxt was only listening on `::1` (IPv6 localhost) instead of all network interfaces. While `vite.server.host: "0.0.0.0"` was configured in `nuxt.config.ts`, this setting alone was insufficient. Nuxt requires a separate `devServer` configuration at the root level to bind to all interfaces.
- **Resolution:** Added the following configuration to `nuxt.config.ts` at the root level:
    ```typescript
    devServer: {
        host: "0.0.0.0",
        port: 3000,
    }
    ```
    After restarting the container with `podman-compose restart nuxt`, the server became accessible at `http://localhost:3000`.

---

## Final Conclusion

**Status:** ✅ **RESOLVED - Containerized development environment is fully functional.**

All issues have been identified and fixed:

1. ✅ `pnpm-lock.yaml` copying resolved
2. ✅ Podman state cleanup completed
3. ✅ Database health check corrected
4. ✅ YAML parsing errors fixed
5. ✅ Service indentation corrected (this was the primary blocker)
6. ✅ Nuxt server network binding configured

The containerized environment now works as intended:

- Both containers (`db` and `nuxt`) start successfully
- Database is healthy and accessible
- Nuxt dev server is accessible at `http://localhost:3000`
- HMR (Hot Module Replacement) is configured with file polling
- Single command startup: `pnpm run dev:container`

**Note:** The initial suspicion that `podman-compose` was unreliable was incorrect. The tool was functioning correctly; the issue was a subtle YAML indentation error that caused the service hierarchy to be parsed incorrectly.
