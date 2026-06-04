import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useIpcMutation } from "@renderer/hooks/useIpc";

type MapDataExplorerCreateTrailFormProps = {
  mapId: number;
};

export function MapDataExplorerCreateTrailForm({ mapId }: MapDataExplorerCreateTrailFormProps) {
  const { t } = useTranslation();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const createTrail = useIpcMutation("trails:create");

  return (
    <form
      className="mb-4 flex flex-wrap items-end gap-2 rounded-box border border-base-content/10 bg-base-100/50 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = slug.trim();
        if (!trimmed) {
          return;
        }
        void createTrail.mutateAsync({
          mapId,
          slug: trimmed,
          name: name.trim() || null,
        });
        setSlug("");
        setName("");
      }}
      data-test="data-explorer-create-trail"
    >
      <label className="form-control min-w-[8rem] flex-1 gap-1">
        <span className="label-text text-xs">{t("maps.workspace.dataExplorer.trailSlug")}</span>
        <input
          className="input-bordered input input-sm w-full font-mono"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="10k-blue"
        />
      </label>
      <label className="form-control min-w-[8rem] flex-1 gap-1">
        <span className="label-text text-xs">{t("maps.workspace.dataExplorer.name")}</span>
        <input
          className="input-bordered input input-sm w-full"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <button
        type="submit"
        className="btn btn-sm btn-primary"
        disabled={createTrail.isPending || !slug.trim()}
      >
        {t("maps.workspace.dataExplorer.createTrail")}
      </button>
    </form>
  );
}
