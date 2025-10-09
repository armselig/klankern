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
        "#composables": aliasComposables,
        "#server": aliasServer,
        "#shared": aliasShared,
        "#auth": aliasAuth,
        "#imports": aliasImports,
    },
    nitro: {
        alias: {
            "#composables": aliasComposables,
            "#server": aliasServer,
            "#auth": aliasAuth,
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
});
