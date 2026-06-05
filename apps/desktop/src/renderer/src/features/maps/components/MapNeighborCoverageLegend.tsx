import { useTranslation } from "react-i18next";

export function MapNeighborCoverageLegend() {
  const { t } = useTranslation();

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-1000 max-w-[18rem] rounded-md bg-base-100/92 px-2.5 py-1.5 text-[10px] text-base-content/65 shadow-sm">
      {t("maps.workspace.neighborCoverageLegend")}
    </div>
  );
}
