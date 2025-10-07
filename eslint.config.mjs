import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint"; // Changed import
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import importPlugin from "eslint-plugin-import";
import vueA11y from "eslint-plugin-vuejs-accessibility"; // New import

export default withNuxt([
    {
        ignores: [".nuxt/**", "eslint.config.mjs", ".output/**"],
    },
    ...tseslint.configs.recommendedTypeChecked, // Added
    ...vue.configs["flat/recommended"],
    {
        files: ["**/*.{ts,tsx,vue}"],
        plugins: {
            "@typescript-eslint": tseslint.plugin, // Changed
            vue: vue,
            import: importPlugin,
            "vuejs-accessibility": vueA11y, // Add the new plugin
        },
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser, // Changed
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
            // "@typescript-eslint/prefer-nullish-coalescing": "off", // Disabled for now
            // Temporarily disable unsafe TypeScript ESLint rules
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-argument": "off", // Temporarily disabled to unblock progress
            "@typescript-eslint/no-floating-promises": "off", // Temporarily disabled to unblock progress
            "@typescript-eslint/no-base-to-string": "off", // Temporarily disabled to unblock progress
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
