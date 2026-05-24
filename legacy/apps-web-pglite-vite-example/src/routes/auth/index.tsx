import { AppConfig } from "@/utils/system";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { SigninPage } from "./-components/SigninPage";

const searchparams = z.object({
  returnTo: z.string().default("/"),
  callbackURL: z.string().optional(),
  useAnotherAccount: z.boolean().default(false).optional(),
});
export const Route = createFileRoute("/auth/")({
  component: SigninPage,
  validateSearch: (search) => searchparams.parse(search),
  async beforeLoad(ctx) {
    const viewer = ctx.context?.viewer;
    const returnTo = ctx.search?.returnTo ?? "/";
    const useAnotherAccount = ctx.search?.useAnotherAccount ?? false;
    if (viewer?.user && !useAnotherAccount) {
      throw redirect({ to: returnTo });
    }
  },
  head: () => ({
    meta: [
      {
        title: `${AppConfig.name} | Sign in`,
        description: "Sign in to manage your JSON résumé and exports",
      },
    ],
  }),
});
