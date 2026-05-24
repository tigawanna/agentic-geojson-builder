import { db, initPgliteDb, pgliteClient, type PgliteDb } from "@/lib/pglite/client";
import type { PGlite } from "@electric-sql/pglite";
import { createContext, use, type ReactNode } from "react";

type PgliteContextValue = {
  db: PgliteDb;
  client: PGlite;
};

const PgliteContext = createContext<PgliteContextValue | null>(null);

export function PgliteProvider({ children }: { children: ReactNode }) {
  use(initPgliteDb());

  return <PgliteContext value={{ db, client: pgliteClient }}>{children}</PgliteContext>;
}

export function usePglite() {
  const context = use(PgliteContext);
  if (!context) {
    throw new Error("usePglite must be used within PglteProvider");
  }
  return context;
}
