import { Map } from "lucide-react";

export const AppConfig = {
  name: "Agentic GeoJSON Builder",
  wordmark: "AGB",
  brief:
    "Turn park maps and trail PDFs into structured GeoJSON with agent-assisted tracing and review.",
  description:
    "Upload source maps, georeference overlays, trace paths and landmarks, and export clean GeoJSON. Built with React, TanStack Start, and Vite+.",
  logo: {
    src: "/logo.png",
    alt: "Agentic GeoJSON Builder",
    href: "/",
  },
  icon: Map,
  themeStorageKey: "agentic-geojson-builder.theme",
  links: {
    github: "https://github.com/your-org/agentic-geojson-builder",
    mail: "mailto:hello@example.com",
  },
};
