import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

export default withNuxt([
    {
        ignores: [".nuxt/**", "eslint.config.mjs"],
    },
    ...vue.configs["flat/recommended"],
    {
        files: ["**/*.{ts,tsx,vue}"],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsParser,
                project: "./tsconfig.eslint.json",
                extraFileExtensions: [".vue"],
            },
        },
        plugins: {
            "@typescript-eslint": ts,
            vue: vue,
        },
        rules: {
            "vue/multi-word-component-names": "off",
            "no-console": "error",
        },
    },
    {
        files: ["app/**/*.{ts,tsx,vue}", "composables/useLogger.ts"],
        rules: {
            "no-console": "warn",
        },
    },
    eslintPluginPrettierRecommended,
]);
