import { formatForDisplay } from "@tanstack/react-hotkeys";
import { useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SHORTCUT_CATEGORIES,
  getCatalogEntriesForCategory,
  getVisibleShortcutCategories,
  type ShortcutDefinition,
} from "@shared/shortcuts";
import { useKeyboardShortcutsStore } from "@renderer/shortcuts/keyboard-shortcuts-store";

function formatShortcutKeys(definitions: ShortcutDefinition[]): string {
  const keys = definitions.map((entry) => formatForDisplay(entry.hotkey));
  return [...new Set(keys)].join(" · ");
}

function ShortcutGroup({
  category,
  entries,
}: {
  category: (typeof SHORTCUT_CATEGORIES)[number];
  entries: ShortcutDefinition[];
}) {
  const { t } = useTranslation();

  if (entries.length === 0) {
    return null;
  }

  const rows = new Map<string, ShortcutDefinition[]>();
  for (const entry of entries) {
    const rowKey = entry.labelKey;
    const existing = rows.get(rowKey) ?? [];
    existing.push(entry);
    rows.set(rowKey, existing);
  }

  return (
    <section>
      <h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
        {t(`shortcuts.categories.${category}`)}
      </h3>
      <ul className="mt-2 divide-y divide-base-300/80">
        {[...rows.entries()].map(([labelKey, rowEntries]) => (
          <li key={labelKey} className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <span className="min-w-0 text-base-content/90">{t(labelKey)}</span>
            <kbd className="kbd shrink-0 font-mono text-xs kbd-sm">
              {formatShortcutKeys(rowEntries)}
            </kbd>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function KeyboardShortcutsModal() {
  const { t } = useTranslation();
  const open = useKeyboardShortcutsStore((state) => state.open);
  const setOpen = useKeyboardShortcutsStore((state) => state.setOpen);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const visibleCategories = getVisibleShortcutCategories(pathname);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-open modal z-1400">
      <button
        type="button"
        className="modal-backdrop"
        aria-label={t("shortcuts.close")}
        onClick={() => setOpen(false)}
      />
      <div className="modal-box flex max-h-[min(32rem,85vh)] max-w-lg flex-col gap-0 p-0">
        <div className="flex items-start justify-between gap-3 border-b border-base-300 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">{t("shortcuts.title")}</h2>
            <p className="mt-1 text-sm text-base-content/60">{t("shortcuts.subtitle")}</p>
          </div>
          <button
            type="button"
            className="btn btn-circle shrink-0 btn-ghost btn-sm"
            onClick={() => setOpen(false)}
            aria-label={t("shortcuts.close")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-4">
          {SHORTCUT_CATEGORIES.filter((category) => visibleCategories.includes(category)).map(
            (category) => (
              <ShortcutGroup
                key={category}
                category={category}
                entries={getCatalogEntriesForCategory(category)}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
