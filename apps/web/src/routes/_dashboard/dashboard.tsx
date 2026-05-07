import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { ComponentType } from "react";
import {
  Bot,
  CheckCircle2,
  Crosshair,
  Download,
  Layers3,
  Map,
  MapPinned,
  MousePointer2,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/_dashboard/dashboard")({
  component: DashboardPage,
});

const phaseItems = [
  {
    title: "Project model",
    status: "planned",
    description: "Projects, source assets, control points, features, and revisions.",
  },
  {
    title: "Overlay calibration",
    status: "planned",
    description: "Align PDF or image pixels to real longitude and latitude control points.",
  },
  {
    title: "Manual tracing",
    status: "planned",
    description: "Draw and edit paths, areas, and labels with reviewable properties.",
  },
  {
    title: "Agent draft tools",
    status: "planned",
    description: "Let an agent propose GeoJSON features without bypassing human review.",
  },
] as const;

function DashboardPage() {
  return (
    <div className="flex w-full flex-col gap-6" data-test="dashboard-page">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">GeoJSON workspace</h1>
          <p className="mt-1 max-w-3xl text-sm text-base-content/60">
            Phase one is shaping the map extraction workflow: upload a source map, align it to a
            base map, trace features, review agent proposals, and export clean GeoJSON.
          </p>
        </div>
        <Button asChild data-test="dashboard-primary-action">
          <Link to="/">
            View product direction
            <MapPinned className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Upload} label="Step 1" value="Upload" helper="PDF or image source map" />
        <MetricCard icon={Crosshair} label="Step 2" value="Align" helper="Control points on map" />
        <MetricCard
          icon={MousePointer2}
          label="Step 3"
          value="Trace"
          helper="Manual geometry edits"
        />
        <MetricCard icon={Download} label="Step 4" value="Export" helper="Validated GeoJSON" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <Card data-test="dashboard-phase-plan">
          <CardHeader>
            <CardTitle>Phase one build plan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {phaseItems.map((item) => (
              <div key={item.title} className="rounded-md border p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{item.title}</span>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-test="dashboard-tooling">
          <CardHeader>
            <CardTitle>Tooling decisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToolingRow
              icon={Map}
              title="Leaflet first"
              description="Use a proven map canvas for base tiles, overlays, and editor layers."
            />
            <ToolingRow
              icon={Layers3}
              title="GeoJSON as the contract"
              description="Store features as typed, validated FeatureCollections with app metadata."
            />
            <ToolingRow
              icon={Bot}
              title="Agent drafts"
              description="TanStack AI and MCP tools should produce reviewable patches, not silent writes."
            />
          </CardContent>
        </Card>
      </div>

      <Card data-test="dashboard-karura-reference">
        <CardHeader>
          <CardTitle>Reference scenario</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Karura Forest PDF map is the first practical target: bike paths, dog paths, trails,
            and useful labels should become editable line and point features that a cycling or park
            navigation app can actually reason about.
          </p>
          <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <CheckCircle2 className="size-4 text-primary" />
            Human-reviewed output
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-md bg-primary/10 p-3 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolingRow({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Icon className="mt-0.5 size-5 text-primary" />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </div>
  );
}
