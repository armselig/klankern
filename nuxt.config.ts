import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import pkg from "./package.json";

const aliasComposables = fileURLToPath(
    new URL("./app/composables/", import.meta.url),
);
const aliasServer = fileURLToPath(new URL("./server/", import.meta.url));
const aliasShared = fileURLToPath(new URL("./shared/", import.meta.url));
const aliasAuth = fileURLToPath(
    new URL(
        "./node_modules/nuxt-auth-utils/dist/runtime/server/utils/session.js",
        import.meta.url,
    ),
);
const aliasImports = fileURLToPath(
    new URL("./.nuxt/imports.d.ts", import.meta.url),
);

export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    ssr: true,
    devtools: { enabled: true },
    devServer: {
        host: "0.0.0.0",
        port: 3000,
    },
    imports: {
        autoImport: false,
    },
    modules: [
        "@nuxt/eslint",
        "nuxt-security",
        "nuxt-auth-utils",
        "@nuxt/test-utils/module",
        "@pinia/nuxt",
    ],
    css: ["~/assets/styles/index.css"],
    build: {
        transpile: ["zod"],
    },
    alias: {
        "#auth": aliasAuth,
        "#composables": aliasComposables,
        "#imports": aliasImports,
        "#server": aliasServer,
        "#shared": aliasShared,
    },
    nitro: {
        alias: {
            "#auth": aliasAuth,
            "#server": aliasServer,
            "#shared": aliasShared,
        },
    },
    eslint: {
        config: {
            standalone: false,
        },
    },
    runtimeConfig: {
        public: {
            apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api",
            appName: pkg.name,
            appVersion: pkg.version,
            appDescription: pkg.description,
        },
    },
    // auth: {
    //     hash: {
    //         scrypt: {
    //             n: 16384,
    //             r: 8,
    //             p: 1,
    //         },
    //     },
    // },
    vite: {
        server: {
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
});
