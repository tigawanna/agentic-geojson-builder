import { db } from "../db/client";
import { AUTHORIZED_ORIGINS } from "../env";
import { organizationAc, organizationRoles } from "@repo/isomorphic/auth-roles";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, apiKey, bearer, multiSession, openAPI, organization } from "better-auth/plugins";

export const auth = betterAuth({
  appName: "Dishi",
  trustedOrigins: AUTHORIZED_ORIGINS,
  emailAndPassword: {
    enabled: true,
  },
  logger: {
    disabled: false,
    disableColors: false,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  plugins: [
    openAPI(),
    apiKey(),
    bearer(),
    multiSession({
      maximumSessions: 5,
    }),
    admin({
      defaultRole: "user",
    }),
    organization({
      ac: organizationAc,
      roles: organizationRoles,
      adminRoles: ["owner", "manager"],
    }),
  ],
  experimental: {
    joins: true,
  },
});

export type Auth = typeof auth;
