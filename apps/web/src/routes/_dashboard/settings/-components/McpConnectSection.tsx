import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug } from "lucide-react";

export function McpConnectSection() {
  return (
    <Card data-test="mcp-connect-section">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>MCP Tool Bridge</CardTitle>
            <CardDescription>
              Planned bridge for project-aware GeoJSON extraction and review tools.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" disabled data-test="connect-mcp-btn">
            <Plug className="mr-1 size-4" /> Planned
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          The old copied MCP route has been removed from the public app surface. The replacement
          should expose tools such as project context, rendered map view, feature validation, and
          reviewable feature patches.
        </p>
      </CardContent>
    </Card>
  );
}
