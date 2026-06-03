import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { BundleValidationReport } from "@shared/map-bundle.types";

type MapExportValidationListProps = {
  report: BundleValidationReport;
};

export function MapExportValidationList({ report }: MapExportValidationListProps) {
  if (report.issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-box border border-success/30 bg-success/10 p-4 text-sm text-success">
        <CheckCircle2 className="size-4 shrink-0" />
        <span>No validation issues. Bundle is ready to export.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-error">
          <XCircle className="size-4" />
          {report.errorCount} error{report.errorCount === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-warning">
          <AlertTriangle className="size-4" />
          {report.warningCount} warning{report.warningCount === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="space-y-1.5">
        {report.issues.map((issue, index) => (
          <li
            key={`${issue.code}-${index}`}
            className={`flex items-start gap-2 rounded-box border p-3 text-sm ${
              issue.severity === "error"
                ? "border-error/30 bg-error/10 text-error"
                : "border-warning/30 bg-warning/10 text-warning"
            }`}
          >
            {issue.severity === "error" ? (
              <XCircle className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            )}
            <span className="text-base-content/80">{issue.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
