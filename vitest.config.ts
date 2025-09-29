import { defineConfig } from "vitest/config";
import { defineVitestProject } from "@nuxt/test-utils/config";
import path from "path";

export default defineConfig({
    test: {
        projects: [
            await defineVitestProject({
                test: {
                    name: "nuxt",
                    include: ["test/nuxt/**/*.{test,spec}.ts"],
                    environment: "nuxt",
                },
                resolve: {
                    alias: {
                        "~": path.resolve(__dirname, "./"),
                        "~~": path.resolve(__dirname, "./"),
                        "#server": path.resolve(__dirname, "./server"),
                    },
                },
            }),
            {
                test: {
                    name: "unit",
                    include: ["test/unit/**/*.{test,spec}.ts"],
                    environment: "node",
                },
            },
        ],
    },
});
