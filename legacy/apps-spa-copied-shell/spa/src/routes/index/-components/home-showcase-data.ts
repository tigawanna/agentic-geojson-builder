import type { TemplateStackItem } from "@/types/template-stack-item";
import {
  Braces,
  Database,
  FileCode2,
  Gauge,
  Layers,
  Route,
  Sparkles,
  Table2,
  Wind,
  Wrench,
  Zap,
} from "lucide-react";

export const tanstackShowcaseItems: TemplateStackItem[] = [
  {
    title: "TanStack Router",
    description: "File-based routes, type-safe links, loaders, and pending UI wired for this app.",
    Icon: Route,
  },
  {
    title: "TanStack Query",
    description: "Server state, caching, and mutations with React Query patterns.",
    Icon: Sparkles,
  },
  {
    title: "TanStack DB & React DB",
    description: "Collections and sync-friendly data when you connect a backend.",
    Icon: Database,
  },
  {
    title: "TanStack Form",
    description: "Composable forms with validation hooks ready to extend.",
    Icon: Layers,
  },
  {
    title: "TanStack Table",
    description: "Headless tables for sortable, filterable admin-style lists.",
    Icon: Table2,
  },
  {
    title: "TanStack Pacer",
    description: "Throttle and debounce UX helpers for search and high-frequency updates.",
    Icon: Gauge,
  },
];

export const toolingShowcaseItems: TemplateStackItem[] = [
  {
    title: "Vite+ toolchain",
    description: "Vite, Rolldown, Oxlint, Oxfmt, and Vitest through a single `vp` CLI.",
    Icon: Zap,
  },
  {
    title: "TypeScript",
    description: "Strict typing across routes, components, and data layers.",
    Icon: FileCode2,
  },
  {
    title: "Tailwind CSS v4",
    description: "Utility-first styling with the Vite plugin and design tokens.",
    Icon: Wind,
  },
  {
    title: "Radix UI & shadcn-style UI",
    description: "Accessible primitives and composed components for dashboards and forms.",
    Icon: Braces,
  },
  {
    title: "DaisyUI",
    description: "Themeable components layered on Tailwind for quick polish.",
    Icon: Wrench,
  },
];
