import "@tanstack/react-start/server-only";

import { auth } from "@/lib/auth.server";

export async function readSessionFromHeaders(headers: Headers) {
  try {
    return await auth.api.getSession({ headers });
  } catch {
    return null;
  }
}
