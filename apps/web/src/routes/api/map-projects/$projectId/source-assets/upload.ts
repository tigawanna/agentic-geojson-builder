import { auth } from "@/lib/auth";
import { createFileRoute } from "@tanstack/react-router";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const Route = createFileRoute("/api/map-projects/$projectId/source-assets/upload")({
  server: {
    handlers: {
      POST: uploadSourceAsset,
    },
  },
});

async function uploadSourceAsset({
  request,
  params,
}: {
  request: Request;
  params: { projectId: string };
}) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return json({ error: "Unauthorized" }, 401);
  }

  const formData = await request.formData();
  const fileValue = formData.get("file");
  if (!(fileValue instanceof File)) {
    return json({ error: "A PDF or image file is required" }, 400);
  }

  if (fileValue.size > MAX_UPLOAD_BYTES) {
    return json({ error: "Source map files must be 25 MB or smaller" }, 400);
  }

  const assetType = getAssetType(fileValue);
  if (!assetType) {
    return json({ error: "Only PDF and image source maps are supported" }, 400);
  }

  const uploadId = crypto.randomUUID();
  const safeFileName = sanitizeFileName(fileValue.name);
  const storageKey = `uploads/source-assets/${params.projectId}/${uploadId}/${safeFileName}`;
  const { dirname, join } = await import("node:path");
  const { mkdir, writeFile } = await import("node:fs/promises");
  const absolutePath = join(process.cwd(), storageKey);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await fileValue.arrayBuffer()));

  const { createSourceAssetForUser } = await import(
    "@/data-access-layer/map-projects/map-projects.server"
  );
  const sourceAsset = await createSourceAssetForUser(session.user.id, params.projectId, {
    type: assetType,
    fileName: safeFileName,
    storageKey,
    width: parsePositiveNumber(formData.get("width")),
    height: parsePositiveNumber(formData.get("height")),
    pageCount: parsePositiveInteger(formData.get("pageCount")),
  });

  return json({ sourceAsset });
}

function getAssetType(file: File) {
  const lowerName = file.name.toLowerCase();
  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return null;
}

function parsePositiveNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePositiveInteger(value: FormDataEntryValue | null) {
  const parsed = parsePositiveNumber(value);
  if (!parsed) return undefined;
  return Number.isInteger(parsed) ? parsed : undefined;
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
  return cleaned || "source-map";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
