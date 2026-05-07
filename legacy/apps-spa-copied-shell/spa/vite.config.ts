import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

const config = defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["**/routeTree.gen.ts"],
  },
  lint: {
    ignorePatterns: ["**/routeTree.gen.ts"],
    options: { typeAware: true, typeCheck: true },
  },
  server: {
    port: 3040,
    host: true,
  },
  resolve: {
    tsconfigPaths: true,
  },

  plugins: [
    devtools(),
    tailwindcss(),
    tanstackRouter({
      routeToken: "layout", // <-- Add this line
      autoCodeSplitting: true,
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});

export default config;
