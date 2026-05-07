import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createControlPointFn,
  createControlPointInputSchema,
  createManualPointFeatureFn,
  createManualPointFeatureInputSchema,
  deleteControlPointFn,
  deleteSourceAssetFn,
  estimateAffineGeoreferenceFn,
  updateControlPointFn,
  updateControlPointInputSchema,
  updateSourceAssetFn,
  updateSourceAssetInputSchema,
} from "@/data-access-layer/map-projects/map-projects.functions";
import { mapProjectWorkspaceQueryOptions } from "@/data-access-layer/map-projects/map-projects-query-options";
import type { GeoFeatureListItem } from "@/data-access-layer/map-projects/map-projects.types";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import { pathKindSchema, sourceAssetSchema } from "@repo/isomorphic/geojson-builder";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Crosshair,
  FileImage,
  FileJson,
  FileText,
  ListChecks,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  WandSparkles,
  SquareArrowOutUpRight,
  Upload,
} from "lucide-react";
import { useState, type ComponentType, type CSSProperties } from "react";
import { toast } from "sonner";
import { z } from "zod";

const uploadResponseSchema = z.object({
  sourceAsset: sourceAssetSchema,
});

const uploadErrorSchema = z.object({
  error: z.string(),
});

const assetDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function MapProjectWorkspacePage() {
  const { projectId } = useParams({ from: "/_dashboard/map-projects/$projectId/" });
  const { data } = useSuspenseQuery(mapProjectWorkspaceQueryOptions(projectId));
  const [selectedSourceAssetId, setSelectedSourceAssetId] = useState("");
  const selectedSourceAsset =
    data.sourceAssets.find((asset) => asset.id === selectedSourceAssetId) ?? data.sourceAssets[0];
  const selectedAssetControlPoints = selectedSourceAsset
    ? data.controlPoints.filter((point) => point.sourceAssetId === selectedSourceAsset.id)
    : [];
  const selectedAssetGeoreference = selectedSourceAsset
    ? data.georeferences.find((item) => item.sourceAssetId === selectedSourceAsset.id)
    : undefined;

  return (
    <div className="flex w-full flex-col gap-6" data-test="map-project-workspace-page">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/map-projects">
              <ArrowLeft className="size-4" />
              Map projects
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{data.project.name}</h1>
            <Badge variant="outline">{data.project.defaultBaseMap}</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-base-content/60">
            {data.project.description ||
              data.project.locationHint ||
              "Attach a source map, align it, and begin reviewing GeoJSON features."}
          </p>
        </div>
        <SourceAssetUploadPanel projectId={projectId} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard icon={Upload} label="Source assets" value={data.sourceAssets.length} />
        <MetricCard icon={Crosshair} label="Control points" value={data.controlPointCount} />
        <MetricCard icon={FileJson} label="Features" value={data.featureCount} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.42fr)]">
        <Card data-test="workspace-map-placeholder">
          <CardHeader>
            <CardTitle>Map canvas</CardTitle>
          </CardHeader>
          <CardContent>
            <SourceAssetPreview
              projectId={projectId}
              sourceAsset={selectedSourceAsset}
              controlPoints={selectedAssetControlPoints}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card data-test="source-assets-panel">
            <CardHeader>
              <CardTitle>Source assets</CardTitle>
            </CardHeader>
            <CardContent>
              <SourceAssetList projectId={projectId} sourceAssets={data.sourceAssets} />
            </CardContent>
          </Card>

          <Card data-test="georeference-panel">
            <CardHeader>
              <CardTitle>Georeferencing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Place matching pixel and geographic coordinates to prepare an overlay transform.</p>
              <SourceAssetSelector
                sourceAssets={data.sourceAssets}
                selectedSourceAssetId={selectedSourceAsset?.id ?? ""}
                onSelectedSourceAssetIdChange={setSelectedSourceAssetId}
              />
              <div className="rounded-md border p-3">
                <div className="font-medium text-base-content">Selected source asset</div>
                <div className="mt-1">
                  {selectedSourceAsset ? selectedSourceAsset.fileName : "No source asset selected"}
                </div>
                {selectedSourceAsset?.width && selectedSourceAsset.height ? (
                  <div className="mt-1 text-xs">
                    {selectedSourceAsset.width} x {selectedSourceAsset.height}px
                  </div>
                ) : null}
                {selectedSourceAsset?.pageCount ? (
                  <div className="mt-1 text-xs">{selectedSourceAsset.pageCount} pages</div>
                ) : null}
              </div>
              <div className="rounded-md border p-3">
                <div className="font-medium text-base-content">Current transform</div>
                <div className="mt-1">
                  {selectedAssetGeoreference
                    ? `Affine, ${formatCoordinate(selectedAssetGeoreference.residualErrorMeters ?? 0)} m RMS`
                    : selectedAssetControlPoints.length >= 3
                      ? "Ready to estimate affine transform"
                      : "Unplaced"}
                </div>
              </div>
              <EstimateAffineButton
                projectId={projectId}
                sourceAssetId={selectedSourceAsset?.id ?? ""}
                disabled={!selectedSourceAsset || selectedAssetControlPoints.length < 3}
              />
              <ControlPointForm
                key={selectedSourceAsset?.id ?? "no-source-asset"}
                projectId={projectId}
                sourceAssetId={selectedSourceAsset?.id ?? ""}
                disabled={!selectedSourceAsset}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.42fr)]">
        <Card data-test="feature-list-panel">
          <CardHeader>
            <CardTitle>Feature review</CardTitle>
          </CardHeader>
          <CardContent>
            <ManualPointFeatureForm
              projectId={projectId}
              sourceAssets={data.sourceAssets}
              defaultSourceAssetId={selectedSourceAsset?.id ?? ""}
            />
            <FeatureList features={data.features} />
          </CardContent>
        </Card>

        <Card data-test="feature-status-breakdown">
          <CardHeader>
            <CardTitle>Review states</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <StatusMetric label="Draft" value={data.featureCounts.draft} />
            <StatusMetric label="Needs review" value={data.featureCounts["needs-review"]} />
            <StatusMetric label="Accepted" value={data.featureCounts.accepted} />
            <StatusMetric label="Rejected" value={data.featureCounts.rejected} />
          </CardContent>
        </Card>
      </div>

      <Card data-test="control-points-panel">
        <CardHeader>
          <CardTitle>Control points</CardTitle>
        </CardHeader>
        <CardContent>
          <ControlPointList projectId={projectId} controlPoints={data.controlPoints} />
        </CardContent>
      </Card>
    </div>
  );
}

function EstimateAffineButton({
  projectId,
  sourceAssetId,
  disabled,
}: {
  projectId: string;
  sourceAssetId: string;
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () =>
      estimateAffineGeoreferenceFn({
        data: { projectId, sourceAssetId },
      }),
    onSuccess(estimated) {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects, projectId] });
      toast.success("Affine transform estimated", {
        description: `${formatCoordinate(estimated.residualErrorMeters ?? 0)} m RMS`,
      });
    },
    onError(err: unknown) {
      toast.error("Failed to estimate transform", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={disabled || mutation.isPending}
      data-test="estimate-affine-transform"
      onClick={() => mutation.mutate()}
    >
      <WandSparkles className="size-4" />
      {mutation.isPending ? "Estimating..." : "Estimate affine transform"}
    </Button>
  );
}

function SourceAssetUploadPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const mutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      setUploadProgress(0);
      return uploadSourceAsset(projectId, selectedFile, setUploadProgress);
    },
    onSuccess(sourceAsset) {
      setFile(null);
      setFileInputKey((key) => key + 1);
      setUploadProgress(null);
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects, projectId] });
      toast.success("Source asset attached", {
        description: sourceAsset.fileName,
      });
    },
    onError(err: unknown) {
      setUploadProgress(null);
      toast.error("Failed to upload source map", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  return (
    <form
      className="flex flex-col gap-2 rounded-md border bg-base-100 p-3 sm:min-w-80"
      data-test="source-asset-upload-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (file) mutation.mutate(file);
      }}
    >
      <label className="text-sm font-medium" htmlFor="source-map-file">
        Attach source map
      </label>
      <div className="flex gap-2">
        <Input
          key={fileInputKey}
          id="source-map-file"
          type="file"
          accept="application/pdf,image/*"
          disabled={mutation.isPending}
          data-test="source-asset-file-input"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Button
          type="submit"
          disabled={!file || mutation.isPending}
          data-test="source-asset-upload-submit"
        >
          <Upload className="size-4" />
          {mutation.isPending ? "Uploading..." : "Upload"}
        </Button>
      </div>
      {file ? (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{file.name}</span>
          <span className="shrink-0">{formatFileSize(file.size)}</span>
        </div>
      ) : null}
      {uploadProgress !== null ? (
        <div className="space-y-1" data-test="source-asset-upload-progress">
          <Progress value={uploadProgress} aria-label="Source asset upload progress" />
          <div className="text-xs text-muted-foreground">{Math.round(uploadProgress)}% uploaded</div>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">PDF or image, up to 25 MB.</p>
    </form>
  );
}

const controlPointFormOptions = formOptions({
  defaultValues: {
    imageX: "",
    imageY: "",
    longitude: "",
    latitude: "",
    residualErrorMeters: "",
  },
});

const pointFeatureFormOptions = formOptions({
  defaultValues: {
    sourceAssetId: "",
    name: "",
    pathKind: "landmark",
    longitude: "",
    latitude: "",
    notes: "",
  },
});

const sourceAssetEditFormOptions = formOptions({
  defaultValues: {
    fileName: "",
    width: "",
    height: "",
    pageCount: "",
  },
});

const controlPointEditFormOptions = formOptions({
  defaultValues: {
    imageX: "",
    imageY: "",
    longitude: "",
    latitude: "",
    residualErrorMeters: "",
  },
});

function SourceAssetSelector({
  sourceAssets,
  selectedSourceAssetId,
  onSelectedSourceAssetIdChange,
}: {
  sourceAssets: z.infer<typeof sourceAssetSchema>[];
  selectedSourceAssetId: string;
  onSelectedSourceAssetIdChange: (sourceAssetId: string) => void;
}) {
  if (!sourceAssets.length) return null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-base-content" htmlFor="georef-source-asset">
        Source asset
      </label>
      <NativeSelect
        id="georef-source-asset"
        value={selectedSourceAssetId}
        className="w-full"
        data-test="georef-source-asset-select"
        onChange={(event) => onSelectedSourceAssetIdChange(event.target.value)}
      >
        {sourceAssets.map((asset) => (
          <NativeSelectOption key={asset.id} value={asset.id}>
            {asset.fileName}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

function SourceAssetPreview({
  projectId,
  sourceAsset,
  controlPoints,
}: {
  projectId: string;
  sourceAsset?: z.infer<typeof sourceAssetSchema>;
  controlPoints: {
    id: string;
    imageX: number;
    imageY: number;
  }[];
}) {
  if (!sourceAsset) {
    return (
      <div className="relative flex min-h-[24rem] items-center justify-center overflow-hidden rounded-md border bg-base-200 p-6">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px]" />
        <Empty className="relative bg-base-100/90 p-6" data-test="source-asset-preview-empty">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileImage />
            </EmptyMedia>
            <EmptyTitle>No source preview</EmptyTitle>
            <EmptyDescription>Upload a source map to begin alignment.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const fileUrl = sourceAssetFileUrl(projectId, sourceAsset.id);
  const markerBounds = getSourceAssetMarkerBounds(sourceAsset);

  return (
    <div
      className="overflow-hidden rounded-md border bg-base-200"
      data-test="source-asset-preview"
    >
      <div className="flex flex-col gap-2 border-b bg-base-100 px-3 py-2 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {sourceAsset.type === "pdf" ? (
            <FileText className="size-4 shrink-0 text-primary" />
          ) : (
            <FileImage className="size-4 shrink-0 text-primary" />
          )}
          <span className="truncate font-medium">{sourceAsset.fileName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{getSourceAssetDetails(sourceAsset)}</span>
          <Button asChild variant="ghost" size="sm" className="h-7 px-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              data-test="open-selected-source-asset-file"
            >
              <SquareArrowOutUpRight className="size-4" />
              Open
            </a>
          </Button>
        </div>
      </div>

      {sourceAsset.type === "pdf" ? (
        <iframe
          title={sourceAsset.fileName}
          src={fileUrl}
          className="h-[32rem] w-full bg-base-100"
          data-test="source-asset-pdf-preview"
        />
      ) : (
        <div className="flex min-h-[24rem] items-center justify-center p-3">
          <div
            className="relative w-full max-w-full overflow-hidden rounded-sm bg-base-100 shadow-sm"
            style={getImagePreviewStyle(sourceAsset)}
          >
            <img
              src={fileUrl}
              alt={sourceAsset.fileName}
              className="h-full w-full object-contain"
              data-test="source-asset-image-preview"
            />
            {markerBounds
              ? controlPoints.map((point, index) => (
                  <div
                    key={point.id}
                    className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-base-100 text-[10px] font-semibold text-primary shadow"
                    style={{
                      left: `${clampPercent((point.imageX / markerBounds.width) * 100)}%`,
                      top: `${clampPercent((point.imageY / markerBounds.height) * 100)}%`,
                    }}
                    title={`Control point ${index + 1}`}
                    data-test="source-asset-control-point-marker"
                  >
                    {index + 1}
                  </div>
                ))
              : null}
          </div>
        </div>
      )}
    </div>
  );
}

function ControlPointForm({
  projectId,
  sourceAssetId,
  disabled,
}: {
  projectId: string;
  sourceAssetId: string;
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (values: typeof controlPointFormOptions.defaultValues) =>
      createControlPointFn({
        data: createControlPointInputSchema.parse({
          projectId,
          sourceAssetId,
          imageX: toNumber(values.imageX),
          imageY: toNumber(values.imageY),
          longitude: toNumber(values.longitude),
          latitude: toNumber(values.latitude),
          residualErrorMeters: toOptionalNumber(values.residualErrorMeters),
        }),
      }),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects, projectId] });
      form.reset();
      toast.success("Control point added");
    },
    onError(err: unknown) {
      toast.error("Failed to add control point", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const form = useAppForm({
    ...controlPointFormOptions,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  return (
    <form
      className="grid gap-3 rounded-md border p-3"
      data-test="control-point-form"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="font-medium text-base-content">Add control point</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.AppField
          name="imageX"
          validators={{ onChange: ({ value }) => validateNumericText(value, "Image X") }}
        >
          {(field) => (
            <field.TextField
              label="Image X"
              type="number"
              step="0.01"
              disabled={disabled || mutation.isPending}
              data-test="control-point-image-x"
            />
          )}
        </form.AppField>
        <form.AppField
          name="imageY"
          validators={{ onChange: ({ value }) => validateNumericText(value, "Image Y") }}
        >
          {(field) => (
            <field.TextField
              label="Image Y"
              type="number"
              step="0.01"
              disabled={disabled || mutation.isPending}
              data-test="control-point-image-y"
            />
          )}
        </form.AppField>
        <form.AppField
          name="longitude"
          validators={{ onChange: ({ value }) => validateRangeText(value, "Longitude", -180, 180) }}
        >
          {(field) => (
            <field.TextField
              label="Longitude"
              type="number"
              step="0.000001"
              disabled={disabled || mutation.isPending}
              data-test="control-point-longitude"
            />
          )}
        </form.AppField>
        <form.AppField
          name="latitude"
          validators={{ onChange: ({ value }) => validateRangeText(value, "Latitude", -90, 90) }}
        >
          {(field) => (
            <field.TextField
              label="Latitude"
              type="number"
              step="0.000001"
              disabled={disabled || mutation.isPending}
              data-test="control-point-latitude"
            />
          )}
        </form.AppField>
      </div>
      <form.AppField
        name="residualErrorMeters"
        validators={{
          onChange: ({ value }) =>
            value ? validateRangeText(value, "Residual error", 0, Number.POSITIVE_INFINITY) : undefined,
        }}
      >
        {(field) => (
          <field.TextField
            label="Residual error meters"
            type="number"
            step="0.01"
            disabled={disabled || mutation.isPending}
            data-test="control-point-residual-error"
          />
        )}
      </form.AppField>
      <form.Subscribe selector={(state) => ({ values: state.values, isPending: mutation.isPending })}>
        {({ values, isPending }) => (
          <Button
            type="submit"
            disabled={
              disabled ||
              isPending ||
              !values.imageX ||
              !values.imageY ||
              !values.longitude ||
              !values.latitude
            }
            data-test="control-point-submit"
          >
            <Crosshair className="size-4" />
            {isPending ? "Adding..." : "Add point"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

function ManualPointFeatureForm({
  projectId,
  sourceAssets,
  defaultSourceAssetId,
}: {
  projectId: string;
  sourceAssets: z.infer<typeof sourceAssetSchema>[];
  defaultSourceAssetId: string;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (values: typeof pointFeatureFormOptions.defaultValues) =>
      createManualPointFeatureFn({
        data: createManualPointFeatureInputSchema.parse({
          projectId,
          sourceAssetId: values.sourceAssetId || undefined,
          name: toOptionalText(values.name),
          pathKind: values.pathKind,
          longitude: toNumber(values.longitude),
          latitude: toNumber(values.latitude),
          notes: toOptionalText(values.notes),
        }),
      }),
    onSuccess(feature) {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects, projectId] });
      form.reset();
      toast.success("Manual feature draft created", {
        description: feature.properties.name || feature.properties.id,
      });
    },
    onError(err: unknown) {
      toast.error("Failed to create feature draft", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const form = useAppForm({
    ...pointFeatureFormOptions,
    defaultValues: {
      ...pointFeatureFormOptions.defaultValues,
      sourceAssetId: defaultSourceAssetId,
    },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  return (
    <form
      className="mb-4 grid gap-3 rounded-md border p-3"
      data-test="manual-point-feature-form"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="flex items-center gap-2 font-medium">
        <MapPin className="size-4 text-primary" />
        Manual point draft
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <form.AppField
          name="name"
          validators={{
            onChange: ({ value }) =>
              value ? validateMaxLengthText(value, "Feature name", 160) : undefined,
          }}
        >
          {(field) => (
            <field.TextField
              label="Feature name"
              placeholder="e.g. Main gate"
              disabled={mutation.isPending}
              data-test="manual-feature-name"
            />
          )}
        </form.AppField>
        <form.AppField name="pathKind">
          {(field) => (
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content" htmlFor="feature-kind">
                Kind
              </label>
              <NativeSelect
                id="feature-kind"
                value={field.state.value}
                className="w-full"
                disabled={mutation.isPending}
                data-test="manual-feature-kind"
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              >
                {pathKindSchema.options.map((kind) => (
                  <NativeSelectOption key={kind} value={kind}>
                    {kind}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}
        </form.AppField>
        <form.AppField
          name="longitude"
          validators={{ onChange: ({ value }) => validateRangeText(value, "Longitude", -180, 180) }}
        >
          {(field) => (
            <field.TextField
              label="Longitude"
              type="number"
              step="0.000001"
              disabled={mutation.isPending}
              data-test="manual-feature-longitude"
            />
          )}
        </form.AppField>
        <form.AppField
          name="latitude"
          validators={{ onChange: ({ value }) => validateRangeText(value, "Latitude", -90, 90) }}
        >
          {(field) => (
            <field.TextField
              label="Latitude"
              type="number"
              step="0.000001"
              disabled={mutation.isPending}
              data-test="manual-feature-latitude"
            />
          )}
        </form.AppField>
      </div>
      <form.AppField name="sourceAssetId">
        {(field) => (
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content" htmlFor="feature-source-asset">
              Source asset
            </label>
            <NativeSelect
              id="feature-source-asset"
              value={field.state.value}
              className="w-full"
              disabled={mutation.isPending}
              data-test="manual-feature-source-asset"
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            >
              <NativeSelectOption value="">No source asset</NativeSelectOption>
              {sourceAssets.map((asset) => (
                <NativeSelectOption key={asset.id} value={asset.id}>
                  {asset.fileName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        )}
      </form.AppField>
      <form.AppField
        name="notes"
        validators={{
          onChange: ({ value }) =>
            value ? validateMaxLengthText(value, "Notes", 500) : undefined,
        }}
      >
        {(field) => (
          <field.TextAreaField
            label="Notes"
            placeholder="Why this point belongs here"
            disabled={mutation.isPending}
            data-test="manual-feature-notes"
          />
        )}
      </form.AppField>
      <form.Subscribe selector={(state) => ({ values: state.values, isPending: mutation.isPending })}>
        {({ values, isPending }) => (
          <Button
            type="submit"
            disabled={isPending || !values.longitude || !values.latitude}
            data-test="manual-feature-submit"
          >
            <Plus className="size-4" />
            {isPending ? "Creating..." : "Create draft"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

function ControlPointList({
  projectId,
  controlPoints,
}: {
  projectId: string;
  controlPoints: {
    id: string;
    sourceAssetId: string;
    imageX: number;
    imageY: number;
    longitude: number;
    latitude: number;
    residualErrorMeters?: number;
  }[];
}) {
  if (!controlPoints.length) {
    return (
      <Empty className="bg-base-200 p-6" data-test="control-points-empty">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Crosshair />
          </EmptyMedia>
          <EmptyTitle>No control points yet</EmptyTitle>
          <EmptyDescription>
            Add at least three points to estimate the first affine transform.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Image pixel</TableHead>
          <TableHead>Longitude</TableHead>
          <TableHead>Latitude</TableHead>
          <TableHead>Residual</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {controlPoints.map((point) => (
          <TableRow key={point.id}>
            <TableCell>
              {formatCoordinate(point.imageX)}, {formatCoordinate(point.imageY)}
            </TableCell>
            <TableCell>{formatCoordinate(point.longitude)}</TableCell>
            <TableCell>{formatCoordinate(point.latitude)}</TableCell>
            <TableCell>
              {point.residualErrorMeters === undefined
                ? "-"
                : `${formatCoordinate(point.residualErrorMeters)} m`}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <EditControlPointButton projectId={projectId} controlPoint={point} />
                <DeleteControlPointButton projectId={projectId} controlPointId={point.id} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

async function uploadSourceAsset(
  projectId: string,
  file: File,
  onProgress: (progress: number) => void,
) {
  const metadata = await getImageMetadata(file);
  const formData = new FormData();
  formData.append("file", file);
  if (metadata.width) formData.append("width", metadata.width.toString());
  if (metadata.height) formData.append("height", metadata.height.toString());

  const body = await uploadFormData(
    `/api/map-projects/${projectId}/source-assets/upload`,
    formData,
    onProgress,
  );

  return uploadResponseSchema.parse(body).sourceAsset;
}

function uploadFormData(
  url: string,
  formData: FormData,
  onProgress: (progress: number) => void,
) {
  return new Promise<unknown>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(clampPercent((event.loaded / event.total) * 100));
    };

    request.onload = () => {
      const body = parseJsonResponse(request.responseText);
      if (request.status < 200 || request.status >= 300) {
        const parsedError = uploadErrorSchema.safeParse(body);
        reject(new Error(parsedError.success ? parsedError.data.error : "Upload failed"));
        return;
      }

      onProgress(100);
      resolve(body);
    };

    request.onerror = () => reject(new Error("Upload failed"));
    request.onabort = () => reject(new Error("Upload was cancelled"));
    request.send(formData);
  });
}

function parseJsonResponse(responseText: string): unknown {
  if (!responseText) return null;
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return null;
  }
}

async function getImageMetadata(file: File) {
  if (!file.type.startsWith("image/")) return {};

  return new Promise<{ width?: number; height?: number }>((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    image.src = url;
  });
}

function validateNumericText(value: string, label: string) {
  if (!value) return `${label} is required`;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return `${label} must be a number`;
  return undefined;
}

function validateRangeText(value: string, label: string, min: number, max: number) {
  const numericError = validateNumericText(value, label);
  if (numericError) return numericError;
  const parsed = Number(value);
  if (parsed < min || parsed > max) return `${label} is out of range`;
  return undefined;
}

function validateMaxLengthText(value: string, label: string, max: number) {
  if (value.length > max) return `${label} must be ${max} characters or fewer`;
  return undefined;
}

function validateRequiredMaxText(value: string, label: string, max: number) {
  if (!value.trim()) return `${label} is required`;
  return validateMaxLengthText(value, label, max);
}

function validateOptionalPositiveNumberText(value: string, label: string) {
  return value ? validateRangeText(value, label, 0.000001, Number.POSITIVE_INFINITY) : undefined;
}

function validateOptionalPositiveIntegerText(value: string, label: string) {
  const numericError = validateOptionalPositiveNumberText(value, label);
  if (numericError) return numericError;
  if (value && !Number.isInteger(Number(value))) return `${label} must be a whole number`;
  return undefined;
}

function toNumber(value: string) {
  return Number(value);
}

function toOptionalNumber(value: string) {
  return value ? Number(value) : undefined;
}

function toOptionalInteger(value: string) {
  return value ? Number(value) : undefined;
}

function toOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function formatCoordinate(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function SourceAssetList({
  projectId,
  sourceAssets,
}: {
  projectId: string;
  sourceAssets: z.infer<typeof sourceAssetSchema>[];
}) {
  if (!sourceAssets.length) {
    return (
      <Empty className="bg-base-200 p-6" data-test="source-assets-empty">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileImage />
          </EmptyMedia>
          <EmptyTitle>No source assets</EmptyTitle>
          <EmptyDescription>Upload a scan, PDF, or image to begin alignment.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>Added</TableHead>
          <TableHead className="text-right">File</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sourceAssets.map((asset) => (
          <TableRow key={asset.id}>
            <TableCell>
              <div className="flex min-w-0 items-center gap-2">
                {asset.type === "pdf" ? (
                  <FileText className="size-4 text-primary" />
                ) : (
                  <FileImage className="size-4 text-primary" />
                )}
                <span className="truncate">{asset.fileName}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{asset.type}</Badge>
                <span className="text-xs text-muted-foreground">{getSourceAssetDetails(asset)}</span>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {assetDateFormatter.format(new Date(asset.createdAt))}
            </TableCell>
            <TableCell className="text-right">
              <Button asChild variant="ghost" size="sm">
                <a
                  href={sourceAssetFileUrl(projectId, asset.id)}
                  target="_blank"
                  rel="noreferrer"
                  data-test="open-source-asset-file"
                >
                  <SquareArrowOutUpRight className="size-4" />
                  Open
                </a>
              </Button>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <EditSourceAssetButton projectId={projectId} sourceAsset={asset} />
                <DeleteSourceAssetButton
                  projectId={projectId}
                  sourceAssetId={asset.id}
                  fileName={asset.fileName}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EditSourceAssetButton({
  projectId,
  sourceAsset,
}: {
  projectId: string;
  sourceAsset: z.infer<typeof sourceAssetSchema>;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const defaultValues = {
    fileName: sourceAsset.fileName,
    width: sourceAsset.width?.toString() ?? "",
    height: sourceAsset.height?.toString() ?? "",
    pageCount: sourceAsset.pageCount?.toString() ?? "",
  };
  const mutation = useMutation({
    mutationFn: async (values: typeof sourceAssetEditFormOptions.defaultValues) =>
      updateSourceAssetFn({
        data: updateSourceAssetInputSchema.parse({
          projectId,
          sourceAssetId: sourceAsset.id,
          fileName: values.fileName,
          width: toOptionalNumber(values.width),
          height: toOptionalNumber(values.height),
          pageCount: toOptionalInteger(values.pageCount),
        }),
      }),
    onSuccess(updatedAsset) {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects, projectId] });
      setOpen(false);
      toast.success("Source asset updated", {
        description: updatedAsset.fileName,
      });
    },
    onError(err: unknown) {
      toast.error("Failed to update source asset", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const form = useAppForm({
    ...sourceAssetEditFormOptions,
    defaultValues,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) form.reset();
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        data-test="edit-source-asset"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-4" />
      </Button>
      <DialogContent className="sm:max-w-lg" data-test="edit-source-asset-dialog">
        <DialogHeader>
          <DialogTitle>Edit source asset</DialogTitle>
          <DialogDescription>Update display metadata for the uploaded source map.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.AppField
            name="fileName"
            validators={{ onChange: ({ value }) => validateRequiredMaxText(value, "File name", 255) }}
          >
            {(field) => (
              <field.TextField
                label="File name"
                disabled={mutation.isPending}
                data-test="edit-source-asset-file-name"
              />
            )}
          </form.AppField>
          <div className="grid gap-3 sm:grid-cols-3">
            <form.AppField
              name="width"
              validators={{
                onChange: ({ value }) => validateOptionalPositiveNumberText(value, "Width"),
              }}
            >
              {(field) => (
                <field.TextField
                  label="Width"
                  type="number"
                  step="0.01"
                  disabled={mutation.isPending}
                  data-test="edit-source-asset-width"
                />
              )}
            </form.AppField>
            <form.AppField
              name="height"
              validators={{
                onChange: ({ value }) => validateOptionalPositiveNumberText(value, "Height"),
              }}
            >
              {(field) => (
                <field.TextField
                  label="Height"
                  type="number"
                  step="0.01"
                  disabled={mutation.isPending}
                  data-test="edit-source-asset-height"
                />
              )}
            </form.AppField>
            <form.AppField
              name="pageCount"
              validators={{
                onChange: ({ value }) => validateOptionalPositiveIntegerText(value, "Page count"),
              }}
            >
              {(field) => (
                <field.TextField
                  label="Pages"
                  type="number"
                  step="1"
                  disabled={mutation.isPending}
                  data-test="edit-source-asset-page-count"
                />
              )}
            </form.AppField>
          </div>
          <form.Subscribe selector={(state) => ({ values: state.values, isPending: mutation.isPending })}>
            {({ values, isPending }) => (
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isPending || !values.fileName.trim()}
                  data-test="update-source-asset-submit"
                >
                  {isPending ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FeatureList({ features }: { features: GeoFeatureListItem[] }) {
  if (!features.length) {
    return (
      <Empty className="bg-base-200 p-6" data-test="features-empty">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ListChecks />
          </EmptyMedia>
          <EmptyTitle>No features yet</EmptyTitle>
          <EmptyDescription>
            Manual traces and agent proposals will appear here for review.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {features.map((feature) => (
          <TableRow key={feature.id}>
            <TableCell className="font-medium">
              {feature.properties.name || feature.properties.id}
            </TableCell>
            <TableCell>{feature.properties.pathKind}</TableCell>
            <TableCell>
              <Badge variant="outline">{feature.status}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{feature.source}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DeleteSourceAssetButton({
  projectId,
  sourceAssetId,
  fileName,
}: {
  projectId: string;
  sourceAssetId: string;
  fileName: string;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => deleteSourceAssetFn({ data: { projectId, sourceAssetId } }),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects, projectId] });
      setConfirming(false);
      toast.success("Source asset removed", {
        description: fileName,
      });
    },
    onError(err: unknown) {
      toast.error("Failed to remove source asset", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  if (confirming) {
    return (
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={mutation.isPending}
          data-test="confirm-delete-source-asset"
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Removing..." : "Confirm"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 text-destructive hover:text-destructive"
      data-test="delete-source-asset"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

function EditControlPointButton({
  projectId,
  controlPoint,
}: {
  projectId: string;
  controlPoint: {
    id: string;
    imageX: number;
    imageY: number;
    longitude: number;
    latitude: number;
    residualErrorMeters?: number;
  };
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const defaultValues = {
    imageX: controlPoint.imageX.toString(),
    imageY: controlPoint.imageY.toString(),
    longitude: controlPoint.longitude.toString(),
    latitude: controlPoint.latitude.toString(),
    residualErrorMeters: controlPoint.residualErrorMeters?.toString() ?? "",
  };
  const mutation = useMutation({
    mutationFn: async (values: typeof controlPointEditFormOptions.defaultValues) =>
      updateControlPointFn({
        data: updateControlPointInputSchema.parse({
          projectId,
          controlPointId: controlPoint.id,
          imageX: toNumber(values.imageX),
          imageY: toNumber(values.imageY),
          longitude: toNumber(values.longitude),
          latitude: toNumber(values.latitude),
          residualErrorMeters: toOptionalNumber(values.residualErrorMeters),
        }),
      }),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects, projectId] });
      setOpen(false);
      toast.success("Control point updated");
    },
    onError(err: unknown) {
      toast.error("Failed to update control point", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  const form = useAppForm({
    ...controlPointEditFormOptions,
    defaultValues,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) form.reset();
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        data-test="edit-control-point"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-4" />
      </Button>
      <DialogContent className="sm:max-w-lg" data-test="edit-control-point-dialog">
        <DialogHeader>
          <DialogTitle>Edit control point</DialogTitle>
          <DialogDescription>
            Updating a control point clears the current transform estimate for its source asset.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.AppField
              name="imageX"
              validators={{ onChange: ({ value }) => validateNumericText(value, "Image X") }}
            >
              {(field) => (
                <field.TextField
                  label="Image X"
                  type="number"
                  step="0.01"
                  disabled={mutation.isPending}
                  data-test="edit-control-point-image-x"
                />
              )}
            </form.AppField>
            <form.AppField
              name="imageY"
              validators={{ onChange: ({ value }) => validateNumericText(value, "Image Y") }}
            >
              {(field) => (
                <field.TextField
                  label="Image Y"
                  type="number"
                  step="0.01"
                  disabled={mutation.isPending}
                  data-test="edit-control-point-image-y"
                />
              )}
            </form.AppField>
            <form.AppField
              name="longitude"
              validators={{ onChange: ({ value }) => validateRangeText(value, "Longitude", -180, 180) }}
            >
              {(field) => (
                <field.TextField
                  label="Longitude"
                  type="number"
                  step="0.000001"
                  disabled={mutation.isPending}
                  data-test="edit-control-point-longitude"
                />
              )}
            </form.AppField>
            <form.AppField
              name="latitude"
              validators={{ onChange: ({ value }) => validateRangeText(value, "Latitude", -90, 90) }}
            >
              {(field) => (
                <field.TextField
                  label="Latitude"
                  type="number"
                  step="0.000001"
                  disabled={mutation.isPending}
                  data-test="edit-control-point-latitude"
                />
              )}
            </form.AppField>
          </div>
          <form.AppField
            name="residualErrorMeters"
            validators={{
              onChange: ({ value }) =>
                validateOptionalPositiveNumberText(value, "Residual error"),
            }}
          >
            {(field) => (
              <field.TextField
                label="Residual error meters"
                type="number"
                step="0.01"
                disabled={mutation.isPending}
                data-test="edit-control-point-residual-error"
              />
            )}
          </form.AppField>
          <form.Subscribe selector={(state) => ({ values: state.values, isPending: mutation.isPending })}>
            {({ values, isPending }) => (
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={
                    isPending ||
                    !values.imageX ||
                    !values.imageY ||
                    !values.longitude ||
                    !values.latitude
                  }
                  data-test="update-control-point-submit"
                >
                  {isPending ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteControlPointButton({
  projectId,
  controlPointId,
}: {
  projectId: string;
  controlPointId: string;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => deleteControlPointFn({ data: { projectId, controlPointId } }),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects] });
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects, projectId] });
      setConfirming(false);
      toast.success("Control point removed");
    },
    onError(err: unknown) {
      toast.error("Failed to remove control point", {
        description: unwrapUnknownError(err).message,
      });
    },
  });

  if (confirming) {
    return (
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={mutation.isPending}
          data-test="confirm-delete-control-point"
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Removing..." : "Confirm"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 text-destructive hover:text-destructive"
      data-test="delete-control-point"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

function StatusMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function sourceAssetFileUrl(projectId: string, sourceAssetId: string) {
  return `/api/map-projects/${projectId}/source-assets/${sourceAssetId}/file`;
}

function getImagePreviewStyle(sourceAsset: z.infer<typeof sourceAssetSchema>): CSSProperties {
  if (!sourceAsset.width || !sourceAsset.height) {
    return { minHeight: "24rem" };
  }

  return {
    aspectRatio: `${sourceAsset.width} / ${sourceAsset.height}`,
    maxHeight: "32rem",
  };
}

function getSourceAssetMarkerBounds(sourceAsset: z.infer<typeof sourceAssetSchema>) {
  if (!sourceAsset.width || !sourceAsset.height) return undefined;
  return {
    width: sourceAsset.width,
    height: sourceAsset.height,
  };
}

function getSourceAssetDetails(sourceAsset: z.infer<typeof sourceAssetSchema>) {
  const measurements = [
    sourceAsset.width && sourceAsset.height
      ? `${formatDimension(sourceAsset.width)} x ${formatDimension(sourceAsset.height)}px`
      : undefined,
    sourceAsset.pageCount ? `${sourceAsset.pageCount} ${sourceAsset.pageCount === 1 ? "page" : "pages"}` : undefined,
  ].filter((item) => item !== undefined);

  return measurements.length ? measurements.join(" · ") : "Metadata pending";
}

function formatDimension(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-md bg-primary/10 p-3 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
