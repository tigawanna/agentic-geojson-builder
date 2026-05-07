import { auth } from "@api/lib/auth";
import { Hono } from "hono";
import { z } from "zod";

function extractMultiSessionCookieValue(
  cookieHeader: string,
  sessionToken: string,
): string | null {
  const targetName = `better-auth.session_token_multi-${sessionToken.toLowerCase()}`;
  for (const cookie of cookieHeader.split(";")) {
    const eqIdx = cookie.indexOf("=");
    if (eqIdx === -1) continue;
    const name = cookie.substring(0, eqIdx).trim();
    if (name === targetName) {
      return cookie.substring(eqIdx + 1).trim();
    }
  }
  return null;
}

function hasMainSessionCookie(cookieHeader: string): boolean {
  for (const cookie of cookieHeader.split(";")) {
    const eqIdx = cookie.indexOf("=");
    if (eqIdx === -1) continue;
    const name = cookie.substring(0, eqIdx).trim();
    if (name === "better-auth.session_token") return true;
  }
  return false;
}

const setActiveSessionBodySchema = z.object({
  sessionToken: z.string(),
});

export const sessionRoute = new Hono().post(
  "/set-active",
  async (c) => {
    const raw = await c.req.json();
    const parsed = setActiveSessionBodySchema.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: "Invalid body", issues: parsed.error.issues }, 400);
    }

    const headers = new Headers(c.req.raw.headers);
    const existingCookies = headers.get("cookie") ?? "";

    if (!hasMainSessionCookie(existingCookies)) {
      const signedValue = extractMultiSessionCookieValue(
        existingCookies,
        parsed.data.sessionToken,
      );
      if (signedValue) {
        headers.set(
          "cookie",
          `${existingCookies}; better-auth.session_token=${signedValue}`,
        );
      }
    }

    const response = await auth.api.setActiveSession({
      body: { sessionToken: parsed.data.sessionToken },
      headers,
      asResponse: true,
    });

    const setCookies = response.headers.getSetCookie();
    for (const cookie of setCookies) {
      c.res.headers.append("set-cookie", cookie);
    }

    return c.json(await response.json(), response.status as any);
  },
);
