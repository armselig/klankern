import pkg from "./package.json";
// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from "url";

const aliasServer = fileURLToPath(new URL("./server/", import.meta.url));

export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
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
        "#server": aliasServer,
    },
    nitro: {
        alias: {
            "#server": aliasServer,
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
    auth: {
        hash: {
            scrypt: {
                n: 16384,
                r: 8,
                p: 1,
            },
        },
    },
});
