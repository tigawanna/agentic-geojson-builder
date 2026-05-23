import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  deleteMapMutationOptions,
  listMapsQueryOptions,
} from "@/data-access-layer/pglite/maps-query-options";
import { usePglite } from "@/lib/pglite/components/PgliteProvider";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { z } from "zod";
import { MapsListScafolld } from "./-components/MapsListScafolld";
import { MainLoader } from "@/components/wrappers/MainLoader";

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
  const { db } = usePglite();
  const { sq, cursor, dir } = Route.useSearch();
  const deleteMapMutation = useMutation({
    ...deleteMapMutationOptions(db),
  });
  const query = useQuery({
    ...listMapsQueryOptions(db, {
      keyword: sq,
      cursor,
      direction: dir,
    }),
  });
  if (query.isLoading) {
    return (
      <MapsListScafolld showPagination={false}>
        <div className="flex flex-col gap-4 h-full w-full relative">
          <MainLoader />
        </div>
      </MapsListScafolld>
    );
  }
  if (query.isError) {
    return (
      <MapsListScafolld showPagination={false}>
        <div className="flex flex-col gap-4 h-screen">
          <div>Error: {query.error.message}</div>
        </div>
      </MapsListScafolld>
    );
  }
  const data = query.data;

  if (!data || (data.items.length === 0 && !sq && !cursor)) {
    return (
      <MapsListScafolld showPagination={false}>
        <div className="flex flex-col gap-4 h-screen">
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
      <div className="flex flex-col gap-4 h-screen py-4">
        {data.items.map((map) => (
          <div
            key={map.id}
            className="p-4 border rounded bg-base-200 flex items-center justify-between"
          >
            <h2 className="text-2xl font-bold">{map.name}</h2>
            <Button variant="outline" size="sm" onClick={() => deleteMapMutation.mutate(map.id)}>
              <Trash2 className="ml-2 size-4" />
            </Button>
          </div>
        ))}
      </div>
    </MapsListScafolld>
  );
}
