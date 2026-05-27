import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageShell } from "../../components/common/PageShell";
import { RouterErrorComponent } from "../../lib/tanstack/router/RouterErrorComponent";
import { RouterPendingComponent } from "../../lib/tanstack/router/RouterPendingComponent";
import { usePostsQuery } from "./usePostsQuery";

export function PostsPage() {
  const { t } = useTranslation();
  const { data, isPending, isError, error, refetch, isFetching } = usePostsQuery();

  if (isPending) {
    return <RouterPendingComponent />;
  }

  if (isError) {
    return (
      <PageShell title={t("posts.heading")} description={t("posts.description")}>
        <RouterErrorComponent
          error={error instanceof Error ? error : new Error(t("posts.error"))}
          actions={
            <button
              type="button"
              className="btn gap-2 btn-outline border-primary/40 text-primary hover:border-primary hover:bg-primary hover:text-primary-content"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? t("posts.loading") : t("posts.retry")}
            </button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell title={t("posts.heading")} description={t("posts.description")}>
      <ul className="glass-card divide-y divide-base-content/8 overflow-hidden">
        {data.map((post) => (
          <li key={post.id} className="px-5 py-4 transition-colors hover:bg-base-200/40">
            <h3 className="font-medium capitalize">{post.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-base-content/70">{post.body}</p>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
