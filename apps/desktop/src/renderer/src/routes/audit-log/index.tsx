import { createFileRoute } from "@tanstack/react-router";
import { AuditLogPage } from "@renderer/features/audit-log/AuditLogPage";

export const Route = createFileRoute("/audit-log/")({
  component: AuditLogPage,
});
