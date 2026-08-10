import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
    {
        ignores: ["dist", "node_modules", "coverage"],
        linterOptions: {
            reportUnusedDisableDirectives: "warn",
        },
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettierConfig,
    {
        files: ["**/*.{ts,tsx}"],
        plugins: {
            react,
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: globals.browser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: "detect",
            },
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            ...react.configs.recommended.rules,
            ...react.configs["jsx-runtime"].rules,
            "no-unexpected-multiline": "error",
            eqeqeq: ["error", "always", { null: "ignore" }],
            // Compoviz intentionally uses native prompt/confirm for lightweight
            // browser-only resource naming and destructive confirmations.
            "no-alert": "off",
            "no-implicit-coercion": "error",
            "no-new-func": "error",
            "no-var": "error",
            "object-shorthand": ["warn", "always"],
            "prefer-const": ["warn"],
            "prefer-template": "warn",
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
            "react/jsx-filename-extension": ["error", { extensions: [".tsx"] }],
            "@typescript-eslint/consistent-type-imports": ["warn", { fixStyle: "inline-type-imports" }],
            "@typescript-eslint/no-import-type-side-effects": "error",
            // Existing modules use local declarations as an organizing device;
            // TypeScript still validates that every reference resolves safely.
            "@typescript-eslint/no-use-before-define": "off",
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            // Prettier owns vertical whitespace; enforcing both rules produces
            // conflicting output and obscures semantic lint findings.
            "padding-line-between-statements": "off",
        },
    },
    {
        files: ["**/*.{test,integration.test,property.test,bench.test}.{ts,tsx}"],
        rules: {
            "no-console": "off",
        },
    },
    {
        files: ["*.config.{js,ts}", "vite.config.ts"],
        languageOptions: {
            globals: globals.node,
        },
    },
);
