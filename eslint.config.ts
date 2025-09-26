import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default withNuxt(
    eslintPluginPrettierRecommended,
    {
        files: ["**/*.{js,ts,vue}"], // Apply to JS, TS, and Vue files
        rules: {
            "vue/multi-word-component-names": "off", // Disable for Nuxt pages
            "no-console": "error", // Disallow console.log as per project guidelines
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
