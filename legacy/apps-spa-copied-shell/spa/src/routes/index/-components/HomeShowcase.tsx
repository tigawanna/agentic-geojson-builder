import { FeatureGridSection } from "@/components/common/FeatureGridSection";
import { tanstackShowcaseItems, toolingShowcaseItems } from "./home-showcase-data";
import { HomeHero } from "./HomeHero";

export function HomeShowcase() {
  return (
    <div className="flex w-full flex-col items-center gap-12 py-8">
      <HomeHero />
      <FeatureGridSection
        heading="TanStack stack"
        subheading="Libraries already in the template and ready to wire to your API."
        items={tanstackShowcaseItems}
      />
      <FeatureGridSection
        heading="Tooling & UI"
        subheading="Build, lint, and style without bolting everything together from scratch."
        items={toolingShowcaseItems}
      />
    </div>
  );
}
