interface MainLoaderProps {
  className?: string;
}

export function MainLoader({ className }: MainLoaderProps) {
  return (
    <div
      className={`flex min-h-[40vh] w-full flex-col items-center justify-center ${className ?? ""}`}
    >
      <div className="glass-card flex w-full max-w-md flex-col items-center gap-4 px-8 py-10">
        <span className="loading loading-lg loading-spinner text-primary" />
        <p className="text-sm text-base-content/60">Loading…</p>
      </div>
    </div>
  );
}
