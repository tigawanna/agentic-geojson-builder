import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  agentToolNameSchema,
  baseMapProviderSchema,
  featureStatusSchema,
  geoFeatureCollectionSchema,
  pathKindSchema,
} from "@repo/isomorphic/geojson-builder";
import { Bot, CheckCircle2, Crosshair, FileJson, Layers3, MapPinned, Upload } from "lucide-react";

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

const sampleFeatureCollection = geoFeatureCollectionSchema.parse({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [36.8219, -1.2347],
          [36.8241, -1.2338],
        ],
      },
      properties: {
        id: "karura-bike-path-draft",
        name: "Karura bike path draft",
        pathKind: "bike-path",
        source: "agent-proposal",
        status: "needs-review",
        confidence: 0.72,
        notes: "Seed example for the first editor contract.",
      },
    },
  ],
});

export function MapProjectsPage() {
  const feature = sampleFeatureCollection.features[0];

  return (
    <div className="flex w-full flex-col gap-6" data-test="map-projects-page">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Map projects</h1>
          <p className="mt-1 max-w-3xl text-sm text-base-content/60">
            This is the first new project route. It anchors the image-to-GeoJSON schema contract
            before persistence and the interactive Leaflet editor arrive.
          </p>
        </div>
        <Button data-test="new-map-project-button">
          <Upload className="size-4" />
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
          icon={CheckCircle2}
          title="Review"
          description="Promote manual traces and agent drafts into accepted GeoJSON features."
        />
      </div>

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

      <Card data-test="geojson-sample-feature">
        <CardHeader>
          <CardTitle>Validated draft feature</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-3">
            <div className="rounded-md border p-4">
              <div className="mb-2 flex items-center gap-2">
                <Layers3 className="size-4 text-primary" />
                <h2 className="font-medium">{feature.properties.name}</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                A seed FeatureCollection parsed by the shared Zod schema. This gives the UI, agent
                tools, and future database layer one contract to agree on.
              </p>
            </div>
            <div className="grid gap-2 text-sm">
              <PropertyLine label="Status" value={feature.properties.status} />
              <PropertyLine label="Kind" value={feature.properties.pathKind} />
              <PropertyLine
                label="Confidence"
                value={feature.properties.confidence?.toString() ?? "unknown"}
              />
            </div>
          </div>
          <pre className="max-h-96 overflow-auto rounded-md border bg-base-200 p-4 text-xs leading-relaxed">
            {JSON.stringify(sampleFeatureCollection, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
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

function PropertyLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
