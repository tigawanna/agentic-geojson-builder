import { PgliteProvider } from "@/lib/pglite/components/PgliteProvider";

export default function PgliteProviderWrapper({ children }: { children: React.ReactNode }) {
  return <PgliteProvider>{children}</PgliteProvider>;
}
