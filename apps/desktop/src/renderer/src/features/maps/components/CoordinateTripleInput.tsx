import { useRef, type ClipboardEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  mergeCoordinateTriple,
  parseCoordinatePaste,
  type CoordinateField,
  type CoordinateTriple,
} from "@renderer/features/maps/lib/parse-coordinate-paste";

type CoordinateTripleInputProps = {
  value: CoordinateTriple;
  onChange: (value: CoordinateTriple) => void;
  disabled?: boolean;
};

export function CoordinateTripleInput({
  value,
  onChange,
  disabled = false,
}: CoordinateTripleInputProps) {
  const { t } = useTranslation();
  const latitudeRef = useRef<HTMLInputElement>(null);
  const longitudeRef = useRef<HTMLInputElement>(null);
  const altitudeRef = useRef<HTMLInputElement>(null);

  function handlePaste(field: CoordinateField, event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    const patch = parseCoordinatePaste(pasted, field);
    if (!patch) {
      return;
    }
    const partCount = pasted
      .trim()
      .split(/[,;\s]+/)
      .filter(Boolean).length;
    if (partCount > 1) {
      event.preventDefault();
      onChange(mergeCoordinateTriple(value, patch));
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-base-content/50">
        {t("maps.workspace.dataExplorer.edit.pasteHint")}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <label className="form-control gap-1">
          <span className="text-[11px] font-medium text-base-content/60">
            {t("maps.workspace.dataExplorer.edit.latitude")}
          </span>
          <input
            ref={latitudeRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            className="input-bordered input input-sm w-full font-mono text-xs"
            value={value.latitude}
            onChange={(event) => onChange({ ...value, latitude: event.target.value })}
            onPaste={(event) => handlePaste("latitude", event)}
            data-test="edit-latitude"
          />
        </label>
        <label className="form-control gap-1">
          <span className="text-[11px] font-medium text-base-content/60">
            {t("maps.workspace.dataExplorer.edit.longitude")}
          </span>
          <input
            ref={longitudeRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            className="input-bordered input input-sm w-full font-mono text-xs"
            value={value.longitude}
            onChange={(event) => onChange({ ...value, longitude: event.target.value })}
            onPaste={(event) => handlePaste("longitude", event)}
            data-test="edit-longitude"
          />
        </label>
        <label className="form-control gap-1">
          <span className="text-[11px] font-medium text-base-content/60">
            {t("maps.workspace.dataExplorer.edit.altitude")}
          </span>
          <input
            ref={altitudeRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            disabled={disabled}
            className="input-bordered input input-sm w-full font-mono text-xs"
            placeholder="—"
            value={value.altitude}
            onChange={(event) => onChange({ ...value, altitude: event.target.value })}
            onPaste={(event) => handlePaste("altitude", event)}
            data-test="edit-altitude"
          />
        </label>
      </div>
    </div>
  );
}
