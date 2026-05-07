import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  createMapProjectFn,
  createMapProjectInputSchema,
  deleteMapProjectFn,
  updateMapProjectFn,
  updateMapProjectInputSchema,
  type CreateMapProjectInput,
} from "@/data-access-layer/map-projects/map-projects.functions";
import type { MapProjectListItem } from "@/data-access-layer/map-projects/map-projects.types";
import { mapProjectsQueryOptions } from "@/data-access-layer/map-projects/map-projects-query-options";
import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { useAppForm } from "@/lib/tanstack/form";
import { unwrapUnknownError } from "@/utils/errors";
import {
  agentToolNameSchema,
  baseMapProviderSchema,
  featureStatusSchema,
  pathKindSchema,
} from "@repo/isomorphic/geojson-builder";
import { formOptions } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Bot,
  Crosshair,
  FileJson,
  FolderKanban,
  Layers3,
  MapPinned,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const baseMapItems = baseMapProviderSchema.options.map((value) => ({
  value,
  label:
    value === "leaflet-osm"
      ? "OpenStreetMap"
      : value === "google-roadmap"
        ? "Google roadmap"
        : "Google satellite",
}));

const schemaGroups = [
  {
    title: "Project setup",
    icon: MapPinned,
    items: ["project", "source_asset", "control_point", "georeference"],
  },
  {
    title: "Feature editing",
    icon: FileJson,
    items: ["GeoJSON FeatureCollection", "Point", "LineString", "Polygon", "MultiLineString"],
  },
  {
    title: "Agent review",
    icon: Bot,
    items: agentToolNameSchema.options,
  },
] as const;

const createProjectFormOptions = formOptions({
  defaultValues: {
    name: "",
    description: "",
    locationHint: "",
    defaultBaseMap: "leaflet-osm",
  } satisfies CreateMapProjectInput,
});

const projectNameFieldSchema = z.string().trim().min(1, "Project name is required").max(120);
const projectDescriptionFieldSchema = z.string().trim().max(500);
const locationHintFieldSchema = z.string().trim().max(160);

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function MapProjectsPage() {
  const { data: projects } = useSuspenseQuery(mapProjectsQueryOptions);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex w-full flex-col gap-6" data-test="map-projects-page">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Map projects</h1>
          <p className="mt-1 max-w-3xl text-sm text-base-content/60">
            Create source map projects, attach scans, georeference overlays, and review extracted
            GeoJSON drafts.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-test="new-map-project-button">
          <Plus className="size-4" />
          New map project
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <WorkflowCard
          icon={Upload}
          title="Upload"
          description="Accept PDF and image source maps, then render stable preview pages."
        />
        <WorkflowCard
          icon={Crosshair}
          title="Georeference"
          description="Place control points between image pixels and real map coordinates."
        />
        <WorkflowCard
          icon={Layers3}
          title="Extract"
          description="Trace features manually or review draft geometries from agent tools."
        />
      </div>

      {projects.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-test="map-project-list">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <Empty data-test="map-projects-empty" className="bg-base-200">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban />
            </EmptyMedia>
            <EmptyTitle>No map projects yet</EmptyTitle>
            <EmptyDescription>
              Start by naming a source map workspace. Uploads, control points, and GeoJSON features
              will attach to it next.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateOpen(true)} data-test="empty-new-map-project-button">
              <Plus className="size-4" />
              New map project
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
        <Card data-test="geojson-schema-contract">
          <CardHeader>
            <CardTitle>Shared schema contract</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {schemaGroups.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.title} className="rounded-md border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Icon className="size-4 text-primary" />
                    <h2 className="font-medium">{group.title}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card data-test="geojson-taxonomy">
          <CardHeader>
            <CardTitle>Editing taxonomy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TaxonomyRow label="Path kinds" values={pathKindSchema.options} />
            <TaxonomyRow label="Review states" values={featureStatusSchema.options} />
            <TaxonomyRow label="Base maps" values={baseMapProviderSchema.options} />
          </CardContent>
        </Card>
      </div>

      <CreateMapProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function ProjectCard({ project }: { project: MapProjectListItem }) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Card data-test="map-project-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="truncate text-lg">{project.name}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Updated {dateFormatter.format(new Date(project.updatedAt))}
              </p>
            </div>
            <Badge variant="outline">{project.defaultBaseMap}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="min-h-10 text-sm text-muted-foreground">
            {project.description || project.locationHint || "Ready for source assets and tracing."}
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Metric label="Source assets" value={project.sourceAssetCount.toString()} />
            <Metric label="Features" value={project.featureCount.toString()} />
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              className="min-w-0 flex-1"
              data-test="open-map-project-button"
            >
              <Link to="/map-projects/$projectId" params={{ projectId: project.id }}>
                Open workspace
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10"
              data-test="edit-map-project"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
            </Button>
            <DeleteMapProjectButton project={project} />
          </div>
        </CardContent>
      </Card>
      <EditMapProjectDialog project={project} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}

function EditMapProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: MapProjectListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const defaultValues = {
    name: project.name,
    description: project.description ?? "",
    locationHint: project.locationHint ?? "",
    defaultBaseMap: project.defaultBaseMap,
  } satisfies CreateMapProjectInput;

  const mutation = useMutation({
    mutationFn: async (values: typeof defaultValues) =>
      updateMapProjectFn({
        data: updateMapProjectInputSchema.parse({
          projectId: project.id,
          ...values,
        }),
      }),
    onSuccess(updatedProject) {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects] });
      onOpenChange(false);
      toast.success("Map project updated", {
        description: updatedProject.name,
      });
    },
    onError(err: unknown) {
      toast.error("Failed to update map project", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [[queryKeyPrefixes.mapProjects]],
    },
  });

  const form = useAppForm({
    ...formOptions({ defaultValues }),
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) form.reset(defaultValues);
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" data-test="edit-map-project-dialog">
        <DialogHeader>
          <DialogTitle>Edit map project</DialogTitle>
          <DialogDescription>Update the workspace details used across the project list.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.AppField
            name="name"
            validators={{ onChange: ({ value }) => validateText(projectNameFieldSchema, value) }}
          >
            {(field) => (
              <field.TextField
                label="Project name"
                placeholder="e.g. Karura trail map"
                disabled={mutation.isPending}
                data-test="map-project-name-input"
              />
            )}
          </form.AppField>
          <form.AppField
            name="description"
            validators={{
              onChange: ({ value }) => validateText(projectDescriptionFieldSchema, value),
            }}
          >
            {(field) => (
              <field.TextAreaField
                label="Description"
                placeholder="What should be extracted from this source map?"
                disabled={mutation.isPending}
                data-test="map-project-description-input"
              />
            )}
          </form.AppField>
          <div className="grid gap-4 sm:grid-cols-2">
            <form.AppField
              name="locationHint"
              validators={{ onChange: ({ value }) => validateText(locationHintFieldSchema, value) }}
            >
              {(field) => (
                <field.TextField
                  label="Location hint"
                  placeholder="Nairobi, Kenya"
                  disabled={mutation.isPending}
                  data-test="map-project-location-input"
                />
              )}
            </form.AppField>
            <form.AppField name="defaultBaseMap">
              {(field) => (
                <field.SelectField
                  label="Base map"
                  items={baseMapItems}
                  data-test="map-project-basemap-select"
                />
              )}
            </form.AppField>
          </div>
          <form.Subscribe selector={(state) => ({ values: state.values, isPending: mutation.isPending })}>
            {({ values, isPending }) => (
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isPending || !values.name.trim()}
                  data-test="update-map-project-submit"
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

function CreateMapProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (values: typeof createProjectFormOptions.defaultValues) =>
      createMapProjectFn({ data: createMapProjectInputSchema.parse(values) }),
    onSuccess(project) {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects] });
      onOpenChange(false);
      toast.success("Map project created", {
        description: project.name,
      });
    },
    onError(err: unknown) {
      toast.error("Failed to create map project", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [[queryKeyPrefixes.mapProjects]],
    },
  });

  const form = useAppForm({
    ...createProjectFormOptions,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
      form.reset();
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) form.reset();
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" data-test="create-map-project-dialog">
        <DialogHeader>
          <DialogTitle>New map project</DialogTitle>
          <DialogDescription>
            Create the workspace that source maps, control points, and GeoJSON features will belong
            to.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.AppField
            name="name"
            validators={{ onChange: ({ value }) => validateText(projectNameFieldSchema, value) }}
          >
            {(field) => (
              <field.TextField
                label="Project name"
                placeholder="e.g. Karura trail map"
                disabled={mutation.isPending}
                data-test="map-project-name-input"
              />
            )}
          </form.AppField>
          <form.AppField
            name="description"
            validators={{
              onChange: ({ value }) => validateText(projectDescriptionFieldSchema, value),
            }}
          >
            {(field) => (
              <field.TextAreaField
                label="Description"
                placeholder="What should be extracted from this source map?"
                disabled={mutation.isPending}
                data-test="map-project-description-input"
              />
            )}
          </form.AppField>
          <div className="grid gap-4 sm:grid-cols-2">
            <form.AppField
              name="locationHint"
              validators={{ onChange: ({ value }) => validateText(locationHintFieldSchema, value) }}
            >
              {(field) => (
                <field.TextField
                  label="Location hint"
                  placeholder="Nairobi, Kenya"
                  disabled={mutation.isPending}
                  data-test="map-project-location-input"
                />
              )}
            </form.AppField>
            <form.AppField name="defaultBaseMap">
              {(field) => (
                <field.SelectField
                  label="Base map"
                  items={baseMapItems}
                  data-test="map-project-basemap-select"
                />
              )}
            </form.AppField>
          </div>
          <form.Subscribe selector={(state) => ({ values: state.values, isPending: mutation.isPending })}>
            {({ values, isPending }) => (
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isPending || !values.name.trim()}
                  data-test="create-map-project-submit"
                >
                  {isPending ? "Creating..." : "Create project"}
                </Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function validateText(schema: z.ZodString, value: string) {
  const result = schema.safeParse(value);
  if (result.success) return undefined;
  return result.error.issues[0]?.message ?? "Invalid value";
}

function WorkflowCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-3 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TaxonomyRow({ label, values }: { label: string; values: readonly string[] }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-medium">{label}</h2>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value} variant="outline">
            {value}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function DeleteMapProjectButton({ project }: { project: MapProjectListItem }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => deleteMapProjectFn({ data: { projectId: project.id } }),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefixes.mapProjects] });
      setConfirming(false);
      toast.success("Map project deleted", {
        description: project.name,
      });
    },
    onError(err: unknown) {
      toast.error("Failed to delete map project", {
        description: unwrapUnknownError(err).message,
      });
    },
    meta: {
      invalidates: [[queryKeyPrefixes.mapProjects]],
    },
  });

  if (confirming) {
    return (
      <div className="flex gap-1">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={mutation.isPending}
          data-test="confirm-delete-map-project"
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Deleting..." : "Confirm"}
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
      className="size-10 text-destructive hover:text-destructive"
      data-test="delete-map-project"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
