import { AppConfig } from "@/utils/system";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SignupPage } from "./-components/SignupPage";

const searchparams = z.object({
  returnTo: z.string().optional().catch("/"),
  callbackURL: z.string().optional(),
});
export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
  validateSearch: (search) => searchparams.parse(search),
  head: () => ({
    meta: [
      {
        title: `${AppConfig.name} | Sign up`,
        description: "Create an account to start building GeoJSON map projects",
      },
    ],
  }),
});
