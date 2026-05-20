import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { usePglite } from "@/lib/pglite/components/PgliteProvider";
import { mapTable } from "@/lib/pglite/schema/map.schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader } from "lucide-react";

export const Route = createFileRoute("/_dashboard/pglite/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { db } = usePglite();
  const mapsQuery = useQuery({
    queryKey: [queryKeyPrefixes.maps],
    queryFn: () => db.query.mapTable.findMany(),
  });
  const mutation = useMutation({
    mutationFn: ({ input }: { input: { name: string } }) => {
      return db.insert(mapTable).values({
        name: input.name,
      });
    },
    onSuccess: (_, __, ___, ctx) => {
      void ctx.client.invalidateQueries({ queryKey: [queryKeyPrefixes.maps] });
    },
  });
  return (
    <div className="flex flex-col gap-4 min-h-screen">
      <div>
        <input type="text" />
        <button className="btn" onClick={() => mutation.mutate({ input: { name: "Test" } })}>
          Create Map {mutation.isPending ? <Loader className="w-4 h-4" /> : null}
        </button>
      </div>
      <div>
        {mapsQuery.data?.map((map) => (
          <div key={map.id}>{map.name}</div>
        ))}
      </div>
    </div>
  );
}
