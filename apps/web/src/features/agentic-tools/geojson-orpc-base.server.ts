import "@tanstack/react-start/server-only";

import {
  authenticateApiKeyHeaders,
  type ApiKeyPermissionCheck,
} from "@/lib/better-auth/api-key.server";
import { ORPCError, os } from "@orpc/server";

export type AgenticInitialContext = {
  headers?: Headers;
  userId?: string;
};

export type AgenticCurrentContext = {
  headers?: Headers;
  userId: string;
};

export const agenticBase = os
  .$config({
    initialInputValidationIndex: Number.NEGATIVE_INFINITY,
    initialOutputValidationIndex: Number.NEGATIVE_INFINITY,
  })
  .$context<AgenticInitialContext>();

function createAgenticProcedure(permissions: ApiKeyPermissionCheck) {
  return agenticBase.use(async ({ context, next }) => {
    if (context.userId) {
      return next({
        context: {
          headers: context.headers,
          userId: context.userId,
        } satisfies AgenticCurrentContext,
      });
    }

    const { headers } = context;
    if (!headers) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    const auth = await authenticateApiKeyHeaders(headers, permissions);
    if (!auth) {
      throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    return next({
      context: {
        headers,
        userId: auth.userId,
      } satisfies AgenticCurrentContext,
    });
  });
}

export const geojsonListProcedure = createAgenticProcedure({ mapProject: ["list"] });
export const geojsonReadProcedure = createAgenticProcedure({ mapProject: ["view"] });
export const geojsonCreateProcedure = createAgenticProcedure({ mapProject: ["create"] });
export const geojsonUpdateProcedure = createAgenticProcedure({ mapProject: ["update"] });
export const geojsonDeleteProcedure = createAgenticProcedure({ mapProject: ["delete"] });
