import { Outlet } from "@tanstack/react-router";

export function AuthLayout() {
  return (
    <div className="from-primary/20 via-accent/10 to-primary/50 min-h-screen w-full bg-linear-to-br">
      <Outlet />
    </div>
  );
}
