import { Footer } from "@/components/navigation/Footer";
import { Button } from "@/components/ui/button";
import { AppConfig } from "@/utils/system";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  const Icon = AppConfig.icon;

  return (
    <div data-test="landing-page" className="flex min-h-screen flex-col bg-base-100 bg-grid">
      <header className="border-b border-base-300 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <Icon className="size-8 text-primary" />
            <span className="text-lg font-semibold">{AppConfig.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/auth" search={{ returnTo: "/" }}>
                Sign in
              </Link>
            </Button>
            <Button asChild>
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-6 py-16">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Clean slate</p>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{AppConfig.name}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-base-content/70">{AppConfig.brief}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth/signup" search={{ returnTo: "/" }}>
              Create account
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
