import { dialog } from "electron";
import { writeFile } from "node:fs/promises";
import type { IpcChannel, IpcRequest, IpcResponse } from "@shared/ipc-contract.js";
import type { BundleExportFormat } from "@shared/map-bundle.types.js";
import { buildBundle } from "@main/lib/pglite/map-bundle.service.js";

type Handler<K extends IpcChannel> = (
  req: IpcRequest<K>,
) => IpcResponse<K> | Promise<IpcResponse<K>>;

function sanitizeFilename(name: string) {
  return (
    name
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "map"
  );
}

function selectPayload(
  format: BundleExportFormat,
  result: Awaited<ReturnType<typeof buildBundle>>,
): { payload: unknown; featureCount: number; suffix: string } {
  switch (format) {
    case "points":
      return {
        payload: result.bundle.points,
        featureCount: result.bundle.points.features.length,
        suffix: "points",
      };
    case "paths":
      return {
        payload: result.bundle.paths,
        featureCount: result.bundle.paths.features.length,
        suffix: "paths",
      };
    case "links":
      return {
        payload: result.bundle.links,
        featureCount: result.bundle.links.length,
        suffix: "links",
      };
    case "combined":
      return {
        payload: result.combined,
        featureCount: result.combined.features.length,
        suffix: "combined",
      };
    case "bundle":
      return {
        payload: result.bundle,
        featureCount: result.bundle.paths.features.length + result.bundle.points.features.length,
        suffix: "bundle",
      };
  }
}

export const mapBundleHandlers: { [K in IpcChannel]?: Handler<K> } = {
  "bundle:build": async (input) => buildBundle(input),
  "bundle:exportToFile": async (input) => {
    const result = await buildBundle(input);
    const { payload, featureCount, suffix } = selectPayload(input.format, result);

    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: `${sanitizeFilename(result.bundle.mapName ?? "map")}-${suffix}.${input.format === "bundle" || input.format === "links" ? "json" : "geojson"}`,
      filters: [
        { name: "GeoJSON", extensions: ["geojson", "json"] },
        { name: "JSON", extensions: ["json"] },
      ],
    });

    if (canceled || !filePath) {
      return { canceled: true as const };
    }

    await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return { canceled: false as const, savedPath: filePath, featureCount };
  },
};
