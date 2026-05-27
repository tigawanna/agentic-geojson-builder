import { Link } from "@tanstack/react-router";

export function RouterNotFoundComponent() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center py-10">
      <div className="glass-card flex flex-col items-center px-10 py-12 text-center">
        <p className="text-8xl font-bold tracking-tight text-primary/20">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 max-w-sm text-sm text-base-content/60">
          That route does not exist. Head back home to continue.
        </p>
        <Link to="/" className="btn mt-6 btn-sm btn-primary">
          Back to home
        </Link>
      </div>
    </div>
  );
}
