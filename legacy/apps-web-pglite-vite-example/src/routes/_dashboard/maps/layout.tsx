import { createFileRoute, Outlet } from "@tanstack/react-router";
import { lazy } from "react";

const PGLiteProviderWrapper = lazy(() => import("@/lib/pglite/components/PgliteProviderWrapper"));

export const Route = createFileRoute("/_dashboard/maps")({
  component: RouteComponent,
  ssr: false,
});

function RouteComponent() {
  return (
    <PGLiteProviderWrapper>
      <Outlet />
    </PGLiteProviderWrapper>
  );
}
