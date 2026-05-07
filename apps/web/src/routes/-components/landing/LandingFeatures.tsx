const steps = [
  {
    id: "01",
    label: "SOURCE",
    title: "Georeferenced overlays",
    description:
      "Upload a map PDF or image, render pages safely, and align pixels to real coordinates with control points.",
    hoverClass: "group-hover:text-primary",
  },
  {
    id: "02",
    label: "EDITOR",
    title: "Human-first tracing",
    description:
      "Draw paths, polygons, and points with snapping, vertex editing, layer toggles, and explicit review status.",
    hoverClass: "group-hover:text-info",
  },
  {
    id: "03",
    label: "AGENTS",
    title: "Reviewable draft tools",
    description:
      "Agents propose GeoJSON patches with confidence and evidence, then the user accepts, edits, or rejects them.",
    hoverClass: "group-hover:text-base-content",
  },
];

const terminalLines = [
  { prefix: "~/karura", text: " > agentic geojson ./karura-map.pdf --base=osm" },
  { status: "ok", text: "Rendering source PDF page" },
  { status: "ok", text: "Solving overlay control points" },
  { status: "info", text: "Drafting likely bike and dog path segments" },
  { status: "ok", text: "Validating GeoJSON FeatureCollection" },
  { status: "ok", text: "Waiting for human review" },
];

export function LandingFeatures() {
  return (
    <section
      id="pipeline"
      data-test="landing-pipeline"
      className="mx-auto max-w-360 border-x border-border/50 scroll-mt-14 pb-24"
    >
      <div className="px-8 pt-24 pb-12 md:px-16">
        <h2 className="text-3xl font-medium tracking-tight text-base-content md:text-4xl">
          Builder Pipeline
        </h2>
        <p className="mt-4 max-w-[50ch] text-pretty text-muted-foreground">
          The app should make spatial extraction deliberate: align the source, trace the truth,
          invite the agent, and keep every output as inspectable GeoJSON.
        </p>
      </div>

      <div className="mx-8 overflow-hidden border border-border md:mx-16">
        {/* 3 steps */}
        <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-y-0 md:divide-x">
          {steps.map((step) => (
            <div
              key={step.id}
              className="group relative p-8 transition-colors hover:bg-neutral/50 lg:p-12"
            >
              <div className="absolute top-4 right-4 font-mono text-xs text-base-content/20 transition-colors group-hover:text-base-content/40">
                +
              </div>
              <div
                className={`mb-10 font-mono text-4xl font-light tabular-nums text-base-content/30 transition-colors ${step.hoverClass}`}
              >
                {step.id}.
              </div>
              <h3 className="mb-4 text-balance text-xl font-medium tracking-tight text-base-content md:text-2xl">
                {step.title}
              </h3>
              <p className="max-w-[35ch] text-pretty text-sm font-light leading-relaxed text-muted-foreground md:text-base">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Terminal output */}
        <div className="border-t border-border bg-base-200 p-6 font-mono text-xs leading-loose text-muted-foreground">
          {terminalLines.map((line, i) =>
            line.prefix ? (
              <div key={i}>
                <span className="text-base-content/50">{line.prefix}</span>
                {line.text}
              </div>
            ) : (
              <div key={i}>
                [INFO] {line.text}{" "}
                {line.status === "ok" && <span className="text-primary">OK</span>}
              </div>
            ),
          )}
          <div className="mt-4 text-base-content">
            {">"} Artifact generated:{" "}
            <span className="cursor-pointer text-primary underline decoration-primary/30 underline-offset-4">
              out/karura-paths.geojson
            </span>{" "}
            (142kb)
          </div>
        </div>
      </div>
    </section>
  );
}
