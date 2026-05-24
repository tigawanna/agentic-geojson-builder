// src/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().refine(
    (val) => {
      try {
        const u = new URL(val);
        return !!u;
      } catch {
        return false;
      }
    },
    { message: "Invalid DATABASE_URL; must be a valid URL" },
  ),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  BETTER_AUTH_SECRET: z.string(),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  FRONTEND_URL: z.url(),
  LMSTUDIO_BASE_URL: z.url().optional(),
  LMSTUDIO_MODEL: z.string().optional(),
  VITE_AI_LOCAL_MODE: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
});

// Validate client environment
const { success, error, data } = envSchema.safeParse(process.env);

if (!success) {
  const formattedErrors = error.issues.map((e) => `- ${e.path.join(".")}: ${e.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${formattedErrors}`);
}

export const serverEnv = data;
