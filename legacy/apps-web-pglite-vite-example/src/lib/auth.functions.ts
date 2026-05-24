import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const { readSessionFromHeaders } = await import("@/lib/auth.session.server");
  const headers = getRequestHeaders();
  return readSessionFromHeaders(headers);
});

export const ensureSession = createServerFn({ method: "GET" }).handler(async () => {
  const { readSessionFromHeaders } = await import("@/lib/auth.session.server");
  const headers = getRequestHeaders();
  const session = await readSessionFromHeaders(headers);
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
});

export const deleteAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }) => {
    const { auth } = await import("@/lib/auth.server");
    const headers = getRequestHeaders();
    await auth.api.removeUser({ body: { userId: data.userId }, headers });
    return { success: true };
  });
