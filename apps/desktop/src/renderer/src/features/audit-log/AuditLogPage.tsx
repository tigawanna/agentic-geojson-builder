import { useTranslation } from "react-i18next";
import { AuditLogPanel } from "@renderer/features/audit-log/components/AuditLogPanel";

export function AuditLogPage() {
  const { t } = useTranslation();

  return (
    <section className="flex min-h-0 flex-1 animate-fade-in flex-col">
      <p className="mb-3 shrink-0 text-sm text-base-content/55">{t("auditLog.pageDescription")}</p>
      <AuditLogPanel showMapName showMapFilter fillHeight className="min-h-0 flex-1" />
    </section>
  );
}
