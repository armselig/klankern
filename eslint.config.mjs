import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import importPlugin from "eslint-plugin-import";
import vueA11y from "eslint-plugin-vuejs-accessibility"; // New import

export default withNuxt([
    {
        ignores: [".nuxt/**", "eslint.config.mjs"],
    },
    ...vue.configs["flat/recommended"],
    {
        files: ["**/*.{ts,tsx,vue}"],
        plugins: {
            "@typescript-eslint": ts,
            vue: vue,
            import: importPlugin,
            "vuejs-accessibility": vueA11y, // Add the new plugin
        },
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsParser,
                project: "./tsconfig.eslint.json",
                extraFileExtensions: [".vue"],
            },
        },
        settings: {
            "import/resolver": {
                typescript: true,
                node: true,
            },
        },
        rules: {
            "vue/multi-word-component-names": "off",
            "no-console": "error", // Default to error for all files
            ...vueA11y.configs.recommended.rules, // Add recommended a11y rules
            "vuejs-accessibility/label-has-for": [
                "error",
                {
                    required: {
                        some: ["nesting", "id"],
                    },
                },
            ],
        },
    },
    {
        files: ["app/composables/useLogger.ts"], // Only allow console.log in useLogger.ts
        rules: {
            "no-console": "off",
        },
    },
    eslintPluginPrettierRecommended,
]);
