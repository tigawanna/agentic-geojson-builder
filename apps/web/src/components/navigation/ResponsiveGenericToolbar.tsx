import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";
import { Home, LayoutDashboard, ShoppingBag } from "lucide-react";

interface ResponsiveGenericToolbarProps {
  children: React.ReactNode;
}

export function ResponsiveGenericToolbar({ children }: ResponsiveGenericToolbarProps) {
  return (
    <div className="drawer w-full" data-test="sidebar-drawer">
      <input id="my-drawer-3" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex h-full min-h-screen flex-col bg-base-100">
        {/* Mobile Navbar */}
        <div className="navbar sticky top-0 z-10 border-b border-base-300 bg-base-100/80 px-4 py-2 backdrop-blur-md md:hidden">
          <div className="flex-none">
            <label
              htmlFor="my-drawer-3"
              aria-label="open sidebar"
              className="btn btn-square btn-ghost btn-sm"
              data-test="homepage-side-drawer-toggle"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block size-5 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </label>
          </div>
          <div className="flex-1 px-2">
            <Link
              to="/"
              className="flex items-center gap-2 text-lg font-bold text-base-content hover:text-primary"
            >
              {(() => {
                const Icon = AppConfig.icon as any;
                return <Icon className="size-5" />;
              })()}
              <span className="xs:inline hidden">{AppConfig.name}</span>
            </Link>
          </div>
          <div className="flex-none">
            <ThemeToggle />
          </div>
        </div>

        {/* Desktop Navbar */}
        <div
          data-test="homepage-toolbar"
          className="sticky top-0 z-10 hidden w-full items-center justify-between border-b border-base-300 bg-base-100/80 px-8 py-2 backdrop-blur-md md:flex"
        >
          <Link
            to="/"
            data-test="homepage-home-link"
            className="flex items-center gap-2 text-xl font-bold text-base-content hover:text-primary"
          >
            {(() => {
              const Icon = AppConfig.icon as any;
              return <Icon className="size-6" />;
            })()}
            {AppConfig.name}
          </Link>
          <ThemeToggle />
        </div>
        {/* Page content */}
        {children}
      </div>
      <div className="drawer-side z-50">
        <label htmlFor="my-drawer-3" aria-label="close sidebar" className="drawer-overlay"></label>
        <ul
          data-test="homepage-sidebar"
          className="menu min-h-full w-64 border-r border-base-300 bg-base-100 p-4 text-sm md:w-80 md:text-base"
        >
          {/* Sidebar Header */}
          <li className="mb-4 menu-title px-0">
            <Link
              to="/"
              data-test="sidebar-homepage-home-link"
              className="flex items-center justify-center gap-2 rounded-lg p-3 text-lg font-bold hover:bg-base-200 hover:text-primary md:justify-start md:text-xl"
            >
              {(() => {
                const Icon = AppConfig.icon as any;
                return <Icon className="size-6 md:size-8" />;
              })()}
              <span className="hidden md:inline">{AppConfig.name}</span>
            </Link>
          </li>

          <div className="divider my-2" />

          {/* Main Navigation */}
          <li>
            <Link to="/" className="gap-3">
              <Home className="size-5" />
              Home
            </Link>
          </li>
          <li>
            <Link to="/dashboard" className="gap-3">
              <LayoutDashboard className="size-5" />
              Dashboard
            </Link>
          </li>

          <div className="divider my-2">Explore</div>
          <li>
            <Link to="/settings" className="gap-3">
              <ShoppingBag className="size-5" />
              <span>Settings</span>
            </Link>
          </li>

          {/* Theme Toggle for Mobile */}
          <li className="mt-auto border-t border-base-300 pt-4">
            <ThemeToggle />
          </li>
        </ul>
      </div>
    </div>
  );
}
