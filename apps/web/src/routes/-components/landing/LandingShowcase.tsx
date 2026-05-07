import { FileJson, GitCompare, ShieldCheck } from "lucide-react";

const REASONS = [
  {
    icon: FileJson,
    title: "GeoJSON first",
    description:
      "The final artifact is a FeatureCollection with typed properties, provenance, confidence, and review status.",
  },
  {
    icon: GitCompare,
    title: "Patch-friendly edits",
    description:
      "Manual edits and agent proposals can be reviewed as geometry/property patches before they become accepted data.",
  },
  {
    icon: ShieldCheck,
    title: "Human authority",
    description:
      "The agent can help trace, classify, and explain, but the user can inspect and adjust every feature.",
  },
];

export function LandingShowcase() {
  return (
    <section
      id="features"
      data-test="landing-showcase"
      className="mx-auto max-w-360 scroll-mt-14 border-x border-border/50 py-24"
    >
      <div className="px-8 md:px-16">
        <div className="mb-16">
          <h2 className="text-3xl font-medium tracking-tight text-base-content md:text-4xl">
            Why this beats a static PDF
          </h2>
          <p className="mt-4 max-w-[50ch] text-pretty text-muted-foreground">
            A PDF map is useful to look at but hard to query. GeoJSON can power routing, filtering,
            labeling, elevation checks, and better park or cycling experiences.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
          {REASONS.map((reason) => {
            const Icon = reason.icon;
            return (
              <div
                key={reason.title}
                className="group flex flex-col gap-4 bg-base-100 p-8 transition-colors hover:bg-neutral/50 lg:p-12"
              >
                <Icon className="size-6 text-primary transition-transform group-hover:scale-110" />
                <h3 className="text-lg font-medium tracking-tight text-base-content">
                  {reason.title}
                </h3>
                <p className="max-w-[35ch] text-sm leading-relaxed text-muted-foreground">
                  {reason.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
