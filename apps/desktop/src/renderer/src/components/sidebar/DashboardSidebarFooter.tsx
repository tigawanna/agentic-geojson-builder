import { Moon, Sun } from "lucide-react";
import { useTheme } from "@renderer/features/theme/ThemeProvider";
import { cn } from "@renderer/lib/utils";
import { useSidebar } from "@renderer/components/sidebar/SidebarProvider";

export function DashboardSidebarFooter() {
  const { config, colorScheme, setThemeConfig } = useTheme();
  const { isCollapsed } = useSidebar();

  const toggleTheme = () => {
    const next = colorScheme === "light" ? "dark" : "light";
    setThemeConfig({ name: next });
  };

  return (
    <div className="no-drag sidebar-section space-y-2">
      <button
        type="button"
        className={cn(
          "sidebar-link sidebar-link-idle w-full",
          isCollapsed ? "justify-center px-2" : "",
        )}
        onClick={toggleTheme}
        title={colorScheme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-base-100/60 text-base-content/70">
          {colorScheme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </span>
        {!isCollapsed ? (
          <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
            <span>{colorScheme === "light" ? "Dark mode" : "Light mode"}</span>
            <span className="text-[11px] text-base-content/45 capitalize">{config.name} theme</span>
          </span>
        ) : null}
      </button>
    </div>
  );
}
