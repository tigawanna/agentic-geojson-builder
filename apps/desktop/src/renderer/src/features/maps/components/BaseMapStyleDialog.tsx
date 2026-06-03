import { BaseMapStylePicker } from "@renderer/features/maps/components/BaseMapStylePicker";
import type { MapBaseMapStyle } from "@shared/maps.types";
import { Map, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";

type BaseMapStyleDialogProps = {
  open: boolean;
  value: MapBaseMapStyle;
  onChange: (style: MapBaseMapStyle) => void;
  onClose: () => void;
  disabledStyles?: MapBaseMapStyle[];
  disabledHint?: string;
};

export function BaseMapStyleDialog({
  open,
  value,
  onChange,
  onClose,
  disabledStyles = [],
  disabledHint,
}: BaseMapStyleDialogProps) {
  const { t } = useTranslation();

  if (!open) {
    return null;
  }

  function handleSelect(style: MapBaseMapStyle) {
    onChange(style);
    if (!disabledStyles.includes(style)) {
      onClose();
    }
  }

  return createPortal(
    <div className="modal-open modal z-1000">
      <div className="modal-box max-w-md px-6 py-6">
        <button
          type="button"
          className="btn absolute top-3 right-3 btn-circle btn-ghost btn-sm"
          onClick={onClose}
          aria-label={t("maps.workspace.baseMap.dialogClose")}
        >
          <X className="size-4" />
        </button>

        <h2 className="pr-8 text-lg font-semibold">{t("maps.workspace.baseMap.dialogTitle")}</h2>
        <p className="mt-1 text-sm text-base-content/60">
          {t("maps.workspace.baseMap.dialogHint")}
        </p>

        <div className="mt-5">
          <BaseMapStylePicker
            value={value}
            onChange={handleSelect}
            layout="list"
            disabledStyles={disabledStyles}
            disabledHint={disabledHint}
          />
        </div>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        onClick={onClose}
        aria-label={t("maps.workspace.baseMap.dialogClose")}
      />
    </div>,
    document.body,
  );
}

export const MAP_PLAYGROUND_FILLED_BTN =
  "btn shrink-0 btn-sm border-0 bg-base-100/60 shadow-sm transition-colors hover:bg-base-200/70";

type BaseMapStyleDialogTriggerProps = {
  value: MapBaseMapStyle;
  onClick: () => void;
  className?: string;
};

export function BaseMapStyleDialogTrigger({
  value,
  onClick,
  className,
}: BaseMapStyleDialogTriggerProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={`${MAP_PLAYGROUND_FILLED_BTN} ${className ?? ""}`}
      onClick={onClick}
      aria-haspopup="dialog"
      data-test="base-map-style-trigger"
    >
      <Map className="size-4" />
      <span className="hidden max-w-40 truncate sm:inline">
        {t(`maps.workspace.baseMap.${value}`)}
      </span>
    </button>
  );
}
