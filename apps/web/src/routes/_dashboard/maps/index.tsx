import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  deleteMapMutationOptions,
  listMapsQueryOptions,
} from "@/data-access-layer/maps/maps-query-options";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { z } from "zod";
import { MapsListScafolld } from "./-components/MapsListScafolld";
import { MainLoader } from "@/components/wrappers/MainLoader";
import { ErrorOutput } from "@/components/wrappers/ErrorOutput";

const searchParams = z.object({
  sq: z.string().optional(),
  cursor: z.string().optional(),
  dir: z.enum(["after", "before"]).optional().default("after"),
});

export const Route = createFileRoute("/_dashboard/maps/")({
  component: RouteComponent,
  validateSearch: searchParams,
  ssr: false,
});

function RouteComponent() {
  const { sq, cursor, dir } = Route.useSearch();
  const deleteMapMutation = useMutation({
    ...deleteMapMutationOptions(),
  });
  const query = useQuery({
    ...listMapsQueryOptions({
      keyword: sq,
      cursor,
      direction: dir,
    }),
  });
  if (query.isLoading) {
    return (
      <MapsListScafolld showPagination={false}>
        <div className="relative flex size-full flex-col gap-4">
          <MainLoader />
        </div>
      </MapsListScafolld>
    );
  }
  if (query.isError) {
    return (
      <MapsListScafolld showPagination={false}>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <ErrorOutput error={query.error} className="h-[60%] w-[90%]" />
        </div>
      </MapsListScafolld>
    );
  }
  const data = query.data;

  if (!data || (data.items.length === 0 && !sq && !cursor)) {
    return (
      <MapsListScafolld showPagination={false}>
        <div className="flex h-screen flex-col gap-4">
          <Empty>
            <EmptyTitle>No maps found</EmptyTitle>
            <EmptyDescription>Create a new map to get started</EmptyDescription>
            <EmptyContent>
              <Button variant="outline" asChild>
                <Link to="/maps/new">Create Map</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </MapsListScafolld>
    );
  }
  return (
    <MapsListScafolld
      showPagination={true}
      nextCursor={data.nextCursor}
      previousCursor={data.previousCursor}
    >
      <div className="flex h-screen flex-col gap-4 py-4">
        {data.items.map((map) => (
          <div
            key={map.id}
            className="flex items-center justify-between gap-3 rounded border bg-base-200 p-4"
          >
            <Link to="/maps/$id" params={{ id: String(map.id) }} className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-bold">{map.name}</h2>
              {map.pdfFileName ? (
                <p className="truncate text-sm text-base-content/65">{map.pdfFileName}</p>
              ) : null}
            </Link>
            <Button variant="outline" size="sm" onClick={() => deleteMapMutation.mutate(map.id)}>
              <Trash2 className="ml-2 size-4" />
            </Button>
          </div>
        ))}
      </div>
    </MapsListScafolld>
  );
}
