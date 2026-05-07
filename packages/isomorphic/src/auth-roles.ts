import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, memberAc, ownerAc } from "better-auth/plugins/organization/access";

const statement = {
  ...defaultStatements,
  mapProject: ["list", "view", "create", "update", "delete", "export"],
  sourceAsset: ["list", "view", "create", "update", "delete"],
  geoFeature: ["list", "view", "create", "update", "delete", "review"],
  agentRun: ["list", "view", "create", "cancel"],
  exportFile: ["list", "view", "create", "delete"],
} as const;

const organizationAc = createAccessControl(statement);

const organizationRoles = {
  owner: organizationAc.newRole({
    ...ownerAc.statements,
    mapProject: ["list", "view", "create", "update", "delete", "export"],
    sourceAsset: ["list", "view", "create", "update", "delete"],
    geoFeature: ["list", "view", "create", "update", "delete", "review"],
    agentRun: ["list", "view", "create", "cancel"],
    exportFile: ["list", "view", "create", "delete"],
  }),
  editor: organizationAc.newRole({
    ...memberAc.statements,
    mapProject: ["list", "view", "create", "update", "export"],
    sourceAsset: ["list", "view", "create", "update"],
    geoFeature: ["list", "view", "create", "update", "review"],
    agentRun: ["list", "view", "create", "cancel"],
    exportFile: ["list", "view", "create"],
  }),
  viewer: organizationAc.newRole({
    ...memberAc.statements,
    mapProject: ["list", "view", "export"],
    sourceAsset: ["list", "view"],
    geoFeature: ["list", "view"],
    agentRun: ["list", "view"],
    exportFile: ["list", "view"],
  }),
};

type BetterAuthUserRoles = "user" | "admin";
type BetterAuthOrgRole = keyof typeof organizationRoles;
type BetterAuthOrgRoles = BetterAuthOrgRole | BetterAuthOrgRole[];

export {
  organizationAc,
  organizationRoles,
  type BetterAuthOrgRole,
  type BetterAuthOrgRoles,
  type BetterAuthUserRoles,
};
