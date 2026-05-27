import { useState, type ReactNode } from "react";

interface RouterErrorComponentProps {
  error: Error;
  actions?: ReactNode;
}

export function RouterErrorComponent({ error, actions }: RouterErrorComponentProps) {
  const [copied, setCopied] = useState(false);

  const copyStackTrace = async () => {
    if (error.stack) {
      await navigator.clipboard.writeText(error.stack);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="glass-card w-full overflow-hidden border-error/30">
        <div className="border-b border-error/15 bg-error/8 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-error">
            <span className="flex size-8 items-center justify-center rounded-lg bg-error/15">
              !
            </span>
            {error.name}
          </h2>
          <p className="mt-2 text-sm text-base-content/75">{error.message}</p>
        </div>

        {error.stack ? (
          <div className="collapse-arrow collapse">
            <input type="checkbox" />
            <div className="collapse-title text-sm font-medium">View stack trace</div>
            <div className="collapse-content">
              <div className="relative border-t border-base-content/8 bg-base-200/40 p-4">
                <button
                  type="button"
                  onClick={() => void copyStackTrace()}
                  className="btn absolute top-3 right-3 z-10 btn-xs"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <pre className="overflow-x-auto pt-8 text-xs leading-relaxed">{error.stack}</pre>
              </div>
            </div>
          </div>
        ) : null}

        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-base-content/8 bg-base-200/25 px-5 py-4">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
