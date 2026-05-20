import { safeStringToUrl } from "@/utils/url";
import { redirect } from "@tanstack/react-router";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const permissionLevelSchema = z.enum(["read", "write"]);

const createApiKeyInputSchema = z.object({
  name: z.string().trim().min(1),
  permission: permissionLevelSchema,
});

type CreateApiKeyInput = z.infer<typeof createApiKeyInputSchema>;

const PERMISSION_MAP: Record<z.infer<typeof permissionLevelSchema>, Record<string, string[]>> = {
  read: { mapProject: ["list", "view", "export"] },
  write: { mapProject: ["list", "view", "create", "update", "delete", "export"] },
};

const requireViewerMiddleware = createMiddleware().server(async ({ next, request }) => {
  const { readSessionFromHeaders } = await import("@/lib/auth.session.server");
  const session = await readSessionFromHeaders(request.headers);
  if (!session) {
    const returnTo = safeStringToUrl(request.url)?.pathname ?? "/";
    throw redirect({ to: "/auth", search: { returnTo } });
  }
  return await next({
    context: {
      viewer: { user: session.user, session: session.session },
    },
  });
});

export const createApiKeyFn = createServerFn({ method: "POST" })
  .middleware([requireViewerMiddleware])
  .inputValidator((input: CreateApiKeyInput) => createApiKeyInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { auth } = await import("@/lib/auth.server");
    const { name, permission } = data;
    const userId = context.viewer.user.id;

    const result = await auth.api.createApiKey({
      body: {
        name,
        userId,
        permissions: PERMISSION_MAP[permission],
      },
    });

    return { key: result.key };
  });
