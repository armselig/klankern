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
});
