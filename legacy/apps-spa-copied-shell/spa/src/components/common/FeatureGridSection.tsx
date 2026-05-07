import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TemplateStackItem } from "@/types/template-stack-item";

interface FeatureGridSectionProps {
  heading: string;
  subheading?: string;
  items: TemplateStackItem[];
}

export function FeatureGridSection({ heading, subheading, items }: FeatureGridSectionProps) {
  return (
    <section className="w-full max-w-4xl space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
        {subheading ? <p className="text-muted-foreground text-sm">{subheading}</p> : null}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.title}>
            <Card className="h-full border-border/80 bg-base-200/40">
              <CardHeader className="gap-3">
                <div className="text-primary flex items-center gap-2">
                  <item.Icon className="size-5 shrink-0" aria-hidden />
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground leading-snug">
                  {item.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
