import { MapPinned } from "lucide-react";

export const AppConfig = {
  name: "Agentic GeoJSON Builder",
  wordmark: "AGB",
  brief:
    "Turn map images and PDFs into georeferenced, editable GeoJSON with a careful human workflow and agent-assisted drafts.",
  description:
    "A map digitizing workspace for aligning source images, tracing paths, reviewing agent proposals, and exporting validated GeoJSON.",
  logo: {
    src: "/logo.png",
    alt: "Agentic GeoJSON Builder",
    href: "/",
  },
  icon: MapPinned,
  themeStorageKey: "agentic-geojson-builder.theme",
  links: {
    github: "https://github.com/your-org/agentic-geojson-builder",
    mail: "mailto:hello@example.com",
  },
};
