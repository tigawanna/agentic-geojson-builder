import { useTranslation } from "react-i18next";
import { usePostsQuery } from "./usePostsQuery";

export function PostsPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = usePostsQuery();

  return (
    <section className="py-8">
      <h2 className="text-3xl font-semibold tracking-tight">{t("posts.heading")}</h2>
      <p className="mt-2 max-w-prose text-neutral-600 dark:text-neutral-400">
        {t("posts.description")}
      </p>

      <div className="mt-6">
        {isLoading && <p className="text-sm text-neutral-500">{t("posts.loading")}</p>}

        {isError && (
          <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <span>{t("posts.error")}</span>
            <button
              type="button"
              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
              onClick={() => void refetch()}
            >
              {t("posts.retry")}
            </button>
          </div>
        )}

        {data && (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {data.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <h3 className="font-medium capitalize">{p.title}</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{p.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
