import { PgliteProvider } from "@/lib/pglite/components/PgliteProvider";

export default function PgliteLayout({ children }: { children: React.ReactNode }) {
  return <PgliteProvider>{children}</PgliteProvider>;
}
