// viewer
import { auth } from "@api/lib/auth";
import { Hono } from "hono";
import { z } from "zod";

const loginBodySchema = z.object({
  email: z.string(),
  password: z.string(),
});

export const viewerRoute = new Hono()
  .get("/", async (c) => {
    const session = await auth.api.getSession({
      headers: new Headers(c.req.raw.headers),
    });

    if (!session) {
      return c.json({ error: "Unauthorized", user: null, session: null }, 401);
    }

    return c.json({
      user: session.user,
      session: session.session,
    });
  })
  .post("/login", async (c) => {
    const raw = await c.req.json();
    const parsed = loginBodySchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: "Invalid body", issues: parsed.error.issues }, 400);
    }
    const headers = new Headers(c.req.raw.headers);
    const result = await auth.api.signInEmail({
      body: parsed.data,
      headers,
    });
    return c.json(result);
  });


