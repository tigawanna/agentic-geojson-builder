import { Moon, Sun } from "lucide-react";
import { useTheme } from "@renderer/features/theme/ThemeProvider";
import { cn } from "@renderer/lib/utils";
import { useSidebar } from "@renderer/components/sidebar/SidebarProvider";

export function DashboardSidebarFooter() {
  const { theme, resolved, setTheme } = useTheme();
  const { isCollapsed } = useSidebar();
  const showDev = import.meta.env.DEV && !isCollapsed;

  const toggleTheme = () => {
    setTheme(resolved === "light" ? "dark" : "light");
  };

  return (
    <div className="no-drag sidebar-section space-y-2">
      {showDev ? (
        <label className="form-control w-full gap-1">
          <span className="label-text text-[10px] tracking-wide text-base-content/50 uppercase">
            Transition
          </span>
          <select
            className="select-bordered select w-full select-sm"
            defaultValue={document.documentElement.dataset.style ?? "vertical"}
            onChange={(event) => {
              document.documentElement.dataset.style = event.target.value;
            }}
          >
            <option value="default">Default</option>
            <option value="vertical">Vertical</option>
            <option value="wipe">Wipe</option>
            <option value="angled">Angled</option>
            <option value="flip">Flip</option>
            <option value="slides">Slides</option>
          </select>
        </label>
      ) : null}

      <button
        type="button"
        className={cn(
          "sidebar-link sidebar-link-idle w-full",
          isCollapsed ? "justify-center px-2" : "",
        )}
        onClick={toggleTheme}
        title={resolved === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-100/60 text-base-content/70">
          {resolved === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </span>
        {!isCollapsed ? (
          <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
            <span>{resolved === "light" ? "Dark mode" : "Light mode"}</span>
            <span className="text-[11px] text-base-content/45 capitalize">{theme} theme</span>
          </span>
        ) : null}
      </button>
    </div>
  );
}
