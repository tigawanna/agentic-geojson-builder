import { queryKeyPrefixes } from "@/data-access-layer/query-keys";
import { usePglite } from "@/lib/pglite/components/PgliteProvider";
import { mapTable } from "@/lib/pglite/schema/map.schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

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
  });
  return <div>Hello "/_dashboard/pglite/"!</div>;
}
