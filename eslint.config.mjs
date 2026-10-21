import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // These files run directly in Node's CommonJS test runner and load-ts hook.
    files: ["tests/**/*.{js,cjs}"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Classic scripts share intentional globals across their HTML script tags.
    files: ["public/**/*.js"],
    languageOptions: { sourceType: "script", parserOptions: { sourceType: "script" } },
    rules: {
      // Use JavaScript scope/export semantics for classic browser scripts.
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Bundled third-party code and local QA artifacts are not application source.
    "public/vendor/**",
    ".tools/**",
  ]),
]);

export default eslintConfig;
