import { MainLoader } from "@/components/wrappers/MainLoader";
import { createMap } from "@/data-access-layer/pglite/maps-query-options";
import { usePglite } from "@/lib/pglite/components/PgliteProvider";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/_dashboard/maps/new")({
  component: RouteComponent,
  ssr: false,
});

function RouteComponent() {
  const { db } = usePglite();
  const navigate = useNavigate();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    void createMap(db, "Untitled map").then((map) => {
      void navigate({
        to: "/maps/$id",
        params: { id: String(map.id) },
        replace: true,
      });
    });
  }, [db, navigate]);

  return <MainLoader />;
}
