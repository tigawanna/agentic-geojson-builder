import DrizzleORMMigrations from "@proj-airi/unplugin-drizzle-orm-migrations/vite";
import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";
import { nitro } from "nitro/vite";

import tailwindcss from "@tailwindcss/vite";

const drizzlePgliteRoot = fileURLToPath(new URL("./drizzle-pglite", import.meta.url));

const config = defineConfig({
  staged: { "*": "vp check --fix" },
  optimizeDeps: {
    exclude: ["@electric-sql/pglite"],
  },
  server: {
    host: "::",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    tsconfigPaths: true,
  },
  plugins: [
    DrizzleORMMigrations({ root: drizzlePgliteRoot }),
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    tailwindcss(),
    tanstackStart({
      router: {
        routeToken: "layout", // <-- Add this line
      },
    }),
    viteReact({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
});

export default config;
