import { auth } from "@/lib/auth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/map-projects/$projectId/source-assets/$sourceAssetId/file")({
  server: {
    handlers: {
      GET: getSourceAssetFile,
    },
  },
});

async function getSourceAssetFile({
  request,
  params,
}: {
  request: Request;
  params: { projectId: string; sourceAssetId: string };
}) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { getSourceAssetForUser } = await import(
    "@/data-access-layer/map-projects/map-projects.server"
  );
  const sourceAsset = await getSourceAssetForUser(
    session.user.id,
    params.projectId,
    params.sourceAssetId,
  );

  if (!sourceAsset) {
    return json({ error: "Source asset not found" }, 404);
  }

  const { readFile } = await import("node:fs/promises");
  const { resolve, sep } = await import("node:path");
  const storageRoot = resolve(process.cwd(), "uploads/source-assets");
  const filePath = resolve(process.cwd(), sourceAsset.storageKey);

  if (!filePath.startsWith(`${storageRoot}${sep}`)) {
    return json({ error: "Invalid source asset storage path" }, 400);
  }

  try {
    const file = await readFile(filePath);
    return new Response(new Uint8Array(file), {
      headers: {
        "content-type": getContentType(sourceAsset.fileName, sourceAsset.type),
        "content-disposition": `inline; filename="${escapeHeaderValue(sourceAsset.fileName)}"`,
        "content-length": file.byteLength.toString(),
      },
    });
  } catch {
    return json({ error: "Source asset file is missing from local storage" }, 404);
  }
}

function getContentType(fileName: string, type: "pdf" | "image") {
  const lowerName = fileName.toLowerCase();
  if (type === "pdf" || lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".gif")) return "image/gif";
  if (lowerName.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function escapeHeaderValue(value: string) {
  return value.replace(/["\\]/g, "-");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
