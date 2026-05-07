import { defineConfig } from "vite-plus";

const ignoredPaths = ["legacy/**", "**/routeTree.gen.ts"];

export default defineConfig({
  fmt: {
    ignorePatterns: ignoredPaths,
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    ignorePatterns: ignoredPaths,
    options: { typeAware: true, typeCheck: true },
  },
});
