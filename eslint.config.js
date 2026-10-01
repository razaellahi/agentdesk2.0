import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", "public", "playwright-report", "test-results"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh, "jsx-a11y": jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Architecture: features talk to each other only through their public index.ts.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/*", "!@/features/*/index"],
              message: "Import another feature only through its public API: '@/features/<name>'.",
            },
          ],
        },
      ],
    },
  },
  {
    // core/, components/, shared/ and config/ must never depend on features.
    files: ["src/core/**", "src/components/**", "src/shared/**", "src/config/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features/*", "@/app/*"], message: "Lower layers must not import features or app." },
          ],
        },
      ],
    },
  },
  {
    // Colours come from theme tokens only (see src/core/theme/tokens.css).
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message: "Use theme tokens (Tailwind classes / CSS variables) instead of hex colours.",
        },
      ],
    },
  },
  {
    // Login / OTP screens have one task; focusing the first field is the expected behaviour.
    files: ["src/features/auth/**"],
    rules: { "jsx-a11y/no-autofocus": "off" },
  },
  {
    files: ["src/components/ui/**"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["src/**/*.test.{ts,tsx}", "src/test/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off", "no-console": "off" },
  },
  {
    files: ["*.config.{js,ts}", "scripts/**", "e2e/**"],
    languageOptions: { globals: globals.node },
    rules: { "no-console": "off" },
  },
);
