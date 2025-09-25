import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default withNuxt(eslintPluginPrettierRecommended, {
    files: ["**/*.{js,ts,vue}"], // Apply to JS, TS, and Vue files
    rules: {
        "vue/multi-word-component-names": "off", // Disable for Nuxt pages
        // Add other rules here if needed
    },
});
