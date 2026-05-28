import type { ReactNode } from "react";
import { cn } from "@renderer/lib/utils";

interface PageShellProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function PageShell({ title, description, children, className }: PageShellProps) {
  return (
    <section className={cn("animate-fade-in space-y-6", className)}>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-base-content">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-base leading-relaxed text-base-content/65">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
