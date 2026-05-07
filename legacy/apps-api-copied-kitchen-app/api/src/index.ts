import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { envVariables } from "./env";
import { auth } from "./lib/auth";
import { viewerRoute } from "./routes/viewer/route";
import { homeRoute } from "./routes/home/route";
import { sessionRoute } from "./routes/session/route";
import { adminRoute } from "./routes/admin/route";
import { kitchenRoute } from "./routes/kitchen/route";
import { crudRoute } from "./routes/crud/route";

export const app = new Hono()
  .basePath("/api")
  .use("*", logger())
  .use(
    "*",
    cors({
      origin: envVariables.FRONTEND_URL ?? "*",
      credentials: true,
    }),
  )
  .route("/", homeRoute)
  .all("/auth/*", async (c) => {
    return auth.handler(c.req.raw);
  })
  .route("/session", sessionRoute)
  .route("/viewer", viewerRoute)
  .route("/admin", adminRoute)
  .route("/kitchen", kitchenRoute)
  .route("/crud", crudRoute);

const port = envVariables.PORT;

console.log(`API running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
