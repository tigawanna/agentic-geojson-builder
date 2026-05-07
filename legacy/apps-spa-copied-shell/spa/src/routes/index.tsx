import { Footer } from "@/components/navigation/Footer";
import { ResponsiveGenericToolbar } from "@/components/navigation/ResponsiveGenericToolbar";
import { Helmet } from "@/components/wrappers/custom-helmet";
import { createFileRoute } from "@tanstack/react-router";
import { HomeShowcase } from "./index/-components/HomeShowcase";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <div
      data-test="homepage"
      className="bg-base-100 flex h-full min-h-screen w-full flex-col items-center"
    >
      <Helmet
        title="TanStack Router boilerplate"
        description="Starter with TanStack Router, Query, DB, and UI tooling."
      />

      <ResponsiveGenericToolbar>
        <div className="flex h-full min-h-screen w-full flex-col items-center px-5 pb-10">
          <HomeShowcase />
        </div>
        <Footer />
      </ResponsiveGenericToolbar>
    </div>
  );
}
