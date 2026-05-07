import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { Link } from "@tanstack/react-router";

const GEOJSON_SAMPLE = `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Bike path",
        "source": "karura-map-pdf",
        "reviewStatus": "draft"
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [36.8219, -1.2347],
          [36.8241, -1.2338]
        ]
      }
    }
  ]
}`;

export function LandingHero() {
  return (
    <section
      data-test="landing-hero"
      className="relative mx-auto min-h-dvh max-w-360 border-x border-border/50"
    >
      {/* Hero copy */}
      <BackgroundRippleEffect />
      <div className="border-b border-border/50 px-8 py-16 md:px-16 md:py-24 lg:px-24 lg:py-32">
        <div className="flex max-w-4xl flex-col gap-8">
          <div className="flex items-center gap-3 font-mono animate-fade-in">
            <span className="border border-primary/30 bg-primary/5 px-2 py-1 text-xs uppercase tracking-widest text-primary">
              Phase One
            </span>
            <span className="text-xs text-muted-foreground">
              // image overlay - human tracing - agent drafts - GeoJSON out
            </span>
          </div>

          <h1 className="animate-fade-in text-balance font-serif text-5xl font-medium leading-[0.95] tracking-tighter text-base-content md:text-7xl lg:text-8xl">
            Map images into GeoJSON.
          </h1>

          <p className="animate-fade-in max-w-[50ch] text-pretty text-xl font-light leading-relaxed text-muted-foreground md:text-2xl">
            Upload a map PDF, align it to real-world tiles, trace paths by hand, and review
            agent-proposed features before exporting clean spatial data.
          </p>

          <div className="mt-4 flex flex-wrap gap-4 animate-fade-in z-30">
            <Link
              to="/auth"
              search={{ returnTo: "/dashboard" }}
              className="bg-primary px-6 py-3 font-mono font-medium text-primary-content transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
            <Link
              to="/map-projects"
              className="border border-border px-6 py-3 font-mono text-base-content transition-colors hover:bg-neutral"
            >
              View the workflow
            </Link>
          </div>
        </div>
      </div>

      {/* Editor + Preview grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* GeoJSON editor mock */}
        <div className="flex flex-col gap-4 border-r border-b border-border/50 p-6 md:p-12 lg:col-span-7 lg:border-b-0">
          <div className="flex items-end justify-between border-b border-border pb-3 font-mono">
            <div className="flex gap-4">
              <span className="text-xs font-semibold text-base-content">karura.geojson</span>
              <span className="text-xs text-muted-foreground">/projects/karura/</span>
            </div>
            <span className="text-xs text-primary">Line 12, Col 24</span>
          </div>

          <div className="relative min-h-90">
            <div className="absolute inset-0 overflow-hidden border border-border bg-base-200 shadow-[8px_8px_0_var(--color-border)]">
              {/* Line numbers */}
              <div className="absolute top-0 bottom-0 left-0 flex w-12 select-none flex-col items-end border-r border-border bg-neutral/50 px-2 py-6 font-mono text-[11px] text-muted-foreground/60">
                {Array.from({ length: 16 }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <pre className="h-full overflow-auto p-6 pl-16 font-mono text-[13px] leading-relaxed text-base-content">
                {GEOJSON_SAMPLE}
              </pre>
            </div>
          </div>
        </div>

        {/* Map overlay mock */}
        <div className="relative flex flex-col items-center justify-center overflow-hidden border-b border-border/50 bg-neutral/30 p-6 md:p-12 lg:col-span-5 lg:border-b-0">
          <div className="relative z-10 aspect-[1/1.15] w-full max-w-80 overflow-hidden border border-border bg-base-200 shadow-2xl">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-border)_1px,transparent_1px),linear-gradient(0deg,var(--color-border)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />
            <div className="absolute inset-x-8 top-10 h-24 rounded-[40%] border-2 border-primary/70 bg-primary/10" />
            <div className="absolute top-20 right-8 bottom-16 left-12 rounded-[45%] border-2 border-info/60 bg-info/10" />
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 320 368"
              role="img"
              aria-label="Map overlay with traced park paths"
            >
              <path
                d="M34 292 C74 252, 94 250, 132 204 S210 146, 282 96"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                className="text-primary"
              />
              <path
                d="M80 88 C126 126, 144 160, 128 232 S130 310, 212 322"
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="10 10"
                className="text-base-content/70"
              />
              <circle cx="132" cy="204" r="8" className="fill-primary" />
              <circle cx="212" cy="322" r="6" className="fill-info" />
            </svg>
            <div className="absolute left-4 top-4 border border-border bg-base-100/90 px-3 py-2 font-mono text-[10px] uppercase tracking-widest">
              Overlay 72%
            </div>
            <div className="absolute bottom-4 left-4 right-4 border border-border bg-base-100/90 p-3 font-mono text-xs">
              <div className="flex justify-between gap-3">
                <span>bike_path</span>
                <span className="text-primary">draft</span>
              </div>
              <div className="mt-1 text-muted-foreground">2.4km traced from source map</div>
            </div>
          </div>

          <div className="z-10 mt-8 flex gap-6 border border-border bg-base-200/50 px-4 py-2 font-mono text-xs">
            <span className="text-muted-foreground">karura.geojson</span>
            <span className="tabular-nums text-base-content">14 features</span>
            <span className="tabular-nums text-primary">valid</span>
          </div>
        </div>
      </div>
    </section>
  );
}
