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
  },
});
