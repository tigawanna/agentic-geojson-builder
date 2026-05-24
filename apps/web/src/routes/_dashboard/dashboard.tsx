import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, Map, Settings } from "lucide-react";

export const Route = createFileRoute("/_dashboard/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="flex w-full flex-col gap-6" data-test="dashboard-page">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-base-content/60">
          Your workspace scaffold is ready. Map projects and GeoJSON tooling will land here next.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ScaffoldCard
          icon={LayoutDashboard}
          title="Workspace"
          description="Auth, layout, and navigation are wired up and ready for feature work."
        />
        <ScaffoldCard
          icon={Map}
          title="Map projects"
          description="Project list, uploads, and editor routes can be added incrementally."
        />
        <ScaffoldCard
          icon={Settings}
          title="Settings"
          description="Account management and API keys are available under Settings."
        />
      </div>
    </div>
  );
}

function ScaffoldCard({
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
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="size-5" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
