import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  DollarSign,
  Home,
  LayoutDashboard,
  MapPinHouse,
  UserCog,
  Users,
} from "lucide-react";

interface ResponsiveGenericToolbarProps {
  children: React.ReactNode;
}

export function ResponsiveGenericToolbar({ children }: ResponsiveGenericToolbarProps) {
  return (
    <div className="drawer" data-test="sidebar-drawer">
      <input id="my-drawer-3" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content bg-base-100 flex h-full min-h-screen flex-col">
        {/* Navbar */}
        <div className="navbar bg-base-100/80 border-base-300 sticky top-0 z-10 border-b backdrop-blur-md md:hidden">
          <div className="flex-none">
            <label
              htmlFor="my-drawer-3"
              aria-label="open sidebar"
              className="btn btn-square btn-ghost"
              data-test="homepage-side-drawer-toggle"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block h-6 w-6 stroke-current"
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
          <div className="flex-1">
            <Link
              to="/"
              className="text-base-content hover:text-primary flex items-center gap-2 px-2 text-xl font-bold"
            >
              <MapPinHouse className="size-5" />
              TSR template
            </Link>
          </div>
          <div className="flex-none">
            <ThemeToggle />
          </div>
        </div>

        <div
          data-test="homepage-toolbar"
          className="navbar bg-base-100/80 border-base-300 sticky top-0 z-10 hidden border-b backdrop-blur-md md:flex"
        >
          <div className="flex-1">
            <Link
              to="/"
              data-test="homepage-home-link"
              className="btn btn-ghost text-base-content hover:text-primary text-xl font-bold normal-case"
            >
              <MapPinHouse className="size-6" />
              TSR template
            </Link>
          </div>
          <div className="flex-none">
            <ThemeToggle />
          </div>
        </div>
        {/* Page content here */}
        {children}
      </div>
      <div className="drawer-side z-50">
        <label htmlFor="my-drawer-3" aria-label="close sidebar" className="drawer-overlay"></label>
        <ul
          data-test="homepage-sidebar"
          className="menu bg-base-100 border-base-300 min-h-full w-80 border-r p-4"
        >
          {/* Sidebar content here */}
          <li className="menu-title mb-2">
            <Link
              to="/"
              data-test="sidebar-homepage-home-link"
              className="hover:text-primary flex items-center justify-center gap-2 p-4 text-xl font-bold"
            >
              <MapPinHouse className="size-8" />
              <span>TSR template</span>
            </Link>
          </li>

          <div className="divider" />

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

          <div className="divider">Quick Links</div>

          {/* Quick Links */}
          <li>
            <Link to="/dashboard/one" className="gap-3">
              <Building2 className="size-5" />
              One
            </Link>
          </li>
          <li>
            <Link to="/dashboard/two" className="gap-3">
              <Users className="size-5" />
              Two
            </Link>
          </li>
          <li>
            <Link to="/dashboard/three" className="gap-3">
              <DollarSign className="size-5" />
              Three
            </Link>
          </li>
          <li>
            <Link to="/dashboard/four" className="gap-3">
              <UserCog className="size-5" />
              Four
            </Link>
          </li>

          <li className="mt-auto">
            <ThemeToggle />
          </li>
        </ul>
      </div>
    </div>
  );
}
