import path from "node:path";
import { defineVitestProject } from "@nuxt/test-utils/config";
import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test", override: true });

// Set NODE_ENV to 'test' for the test environment
process.env.NODE_ENV = "test";

export default defineConfig({
    test: {
        projects: [
            await defineVitestProject({
                test: {
                    name: "nuxt",
                    include: [
                        "test/nuxt/**/*.{test,spec}.ts",
                        "test/e2e/**/*.{test,spec}.ts",
                    ],
                    environment: "nuxt",
                    setupFiles: ["./test/setup.ts"],
                    env: {
                        NODE_ENV: "test",
                    },
                },
                css: {
                    include: /.+/,
                },
                resolve: {
                    alias: {
                        "~": path.resolve(__dirname, "./app"),
                        "~~": path.resolve(__dirname, "./"),
                        "#server": path.resolve(__dirname, "./server"),
                        "#test": path.resolve(__dirname, "./test"),
                    },
                },
            }),
            {
                test: {
                    name: "unit",
                    include: ["test/unit/**/*.{test,spec}.ts"],
                    environment: "node",
                    setupFiles: ["./test/setup.ts"],
                    env: {
                        NODE_ENV: "test",
                    },
                },
            },
        ],
    },
});
