/* eslint-disable node/no-process-env */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "node:path";
import { z } from "zod";

expand(
  config({
    path: path.resolve(process.cwd(), process.env.NODE_ENV === "test" ? ".env.test" : ".env"),
  }),
);

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(5000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DB_LOG_LEVEL: z.enum(["info","silent"]).default("info"),
  DATABASE_URL: z.url().optional(),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  CRUD_BEARER_TOKEN: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_USER: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export type env = z.infer<typeof EnvSchema>;

const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error("❌ Invalid env:");
  console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

const envVariables = env!;
export { envVariables };

export const isProductionEnv = envVariables.NODE_ENV === "production";

export const AUTHORIZED_ORIGINS = [envVariables.FRONTEND_URL ?? ""];
