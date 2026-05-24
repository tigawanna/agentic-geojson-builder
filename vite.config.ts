import { defineConfig } from "vite-plus";

const ignoredPaths = ["legacy/**", "**/routeTree.gen.ts"];

export default defineConfig({
  fmt: {
    ignorePatterns: ignoredPaths,
    sortTailwindcss: {
      stylesheet: "apps/web/src/styles.css",
      functions: ["cn", "clsx", "cva"],
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    ignorePatterns: ignoredPaths,
    options: { typeAware: true, typeCheck: true },
    jsPlugins: ["oxlint-tailwindcss"],
    settings: {
      tailwindcss: {
        entryPoint: "apps/web/src/styles.css",
      },
    },
    rules: {
      "tailwindcss/no-unknown-classes": "error",
      "tailwindcss/no-duplicate-classes": "error",
      "tailwindcss/no-conflicting-classes": "error",
      "tailwindcss/no-deprecated-classes": "error",
      "tailwindcss/no-unnecessary-whitespace": "error",
      "tailwindcss/no-contradicting-variants": "warn",
      "tailwindcss/enforce-canonical": "warn",
      "tailwindcss/enforce-shorthand": "warn",
      "tailwindcss/enforce-consistent-important-position": "warn",
      "tailwindcss/enforce-negative-arbitrary-values": "warn",
      "tailwindcss/enforce-consistent-variable-syntax": "warn",
      "tailwindcss/consistent-variant-order": "warn",
      "tailwindcss/no-unnecessary-arbitrary-value": "warn",
      "tailwindcss/enforce-sort-order": "off",
    },
  },
});
