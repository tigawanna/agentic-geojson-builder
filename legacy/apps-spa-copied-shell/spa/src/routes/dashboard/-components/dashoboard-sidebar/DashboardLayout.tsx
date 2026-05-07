import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Outlet } from "@tanstack/react-router";
import { DashboardSidebarHeader } from "./DashboardSidebarHeader";
import { DashboardSidebarLinks } from "./DashboardSidebarLinks";
import { DashboardSidebarUser } from "./DashboardSidebarUser";
import { TSRBreadCrumbs } from "@/lib/tanstack/router/TSRBreadCrumbs";
import { DashboardTheme } from "./DashboardTheme";
import { Helmet } from "@/components/wrappers/custom-helmet";

interface DashboardLayoutProps {
  sidebar_props?: React.ComponentProps<typeof Sidebar>;
}

export function DashboardLayout({ sidebar_props }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <Helmet title="Rentals | Dashboard" description="Dashboard for your rentals" />
      <Sidebar className="" collapsible="icon" {...sidebar_props}>
        <SidebarHeader>
          <DashboardSidebarHeader />
        </SidebarHeader>
        <SidebarContent>
          <DashboardSidebarLinks />
        </SidebarContent>
        <SidebarFooter className="gap-3">
          <DashboardTheme />
          <DashboardSidebarUser />
          <div className="h-1" />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="bg-base-100 sticky top-0 z-30 flex h-16 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <TSRBreadCrumbs />
          </div>
        </header>
        {/* main content */}
        <div className="mx-auto flex h-full min-h-screen w-full flex-col items-center justify-center p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
