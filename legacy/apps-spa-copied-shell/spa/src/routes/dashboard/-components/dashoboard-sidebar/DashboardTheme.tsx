import { useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/lib/tanstack/router/use-theme";
import { Sun, Moon } from "lucide-react";

export function DashboardTheme() {
  const { theme, updateTheme } = useTheme();
  const { state } = useSidebar();
  function transitionColors() {
    if (typeof window !== "undefined") {
      try {
        document.startViewTransition(() => {
          const newTheme = theme === "light" ? "dark" : "light";
          document.documentElement.dataset.theme = newTheme;
          updateTheme(newTheme);
        });
      } catch {
        const newTheme = theme === "light" ? "dark" : "light";
        document.documentElement.dataset.theme = newTheme;
        updateTheme(newTheme);
      }
    }
  }
  return (
    <div
      data-expanded={state === "expanded"}
      className="flex w-full items-center justify-center gap-2 data-[expanded=true]:justify-between"
    >
      {import.meta.env.DEV && state === "expanded" && (
        <div className="hidden md:flex">
          <select
            className="select select-bordered select-sm max-w-xs"
            onChange={(e) => (document.documentElement.dataset.style = e.target.value)}
          >
            <option value="default">Default</option>
            <option value="vertical">Vertical</option>
            <option value="wipe">Wipe</option>
            <option value="angled">Angled</option>
            <option value="flip">Flip</option>
            <option value="slides">Slides</option>
          </select>
        </div>
      )}
      <button onClick={() => transitionColors()} className="">
        {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </button>
    </div>
  );
}
