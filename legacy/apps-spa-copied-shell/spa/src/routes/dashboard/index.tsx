import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="bg-base-100 flex h-full min-h-screen w-full items-center justify-center">
      <div className="flex flex-col gap-4 text-center">
        <h1 className="mb-4 text-4xl font-bold">Dashboard Home</h1>
        <Link to="/" className="btn">
          <ChevronLeft /> Go to home
        </Link>
      </div>
    </div>
  );
}
