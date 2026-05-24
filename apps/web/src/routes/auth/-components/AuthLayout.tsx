import { Outlet } from "@tanstack/react-router";

export function AuthLayout() {
  return (
    <div className="min-h-screen w-full bg-linear-to-br from-primary/20 via-accent/10 to-primary/50">
      <Outlet />
    </div>
  );
}
