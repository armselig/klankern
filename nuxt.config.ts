// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from "url";

const aliasServer = fileURLToPath(new URL("./server/", import.meta.url));

export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
    modules: ["@nuxt/eslint"],
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
