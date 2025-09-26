import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import tsParser from "@typescript-eslint/parser"; // Keep this import

export default withNuxt(
    [eslintPluginPrettierRecommended],
    {
        files: ["**/*.{js,ts,vue}"], // Apply to JS, TS, and Vue files
        rules: {
            "vue/multi-word-component-names": "off", // Disable for Nuxt pages
            "no-console": "error", // Disallow console.log as per project guidelines
        },
    },
    // Explicitly configure TypeScript parser for .ts files
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
            },
        },
    },
    // Separate config object for overrides (for useLogger.ts)
    {
        files: ["composables/useLogger.ts"],
        rules: {
            "no-console": "off", // Allow console.log in the logger composable
        },
    },
);
