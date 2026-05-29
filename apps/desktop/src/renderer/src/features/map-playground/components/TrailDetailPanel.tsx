import {
  analyzeTrailFeature,
  formatDistance,
  formatDuration,
  formatElevation,
} from "@renderer/features/map-playground/lib/analyze-trail-feature";
import type { PlaygroundFeature } from "@renderer/types/map-playground.types";
import { ExternalLink, X } from "lucide-react";
import { useTranslation } from "react-i18next";

type TrailDetailPanelProps = {
  feature: PlaygroundFeature;
  onClose: () => void;
};

type StatRowProps = {
  label: string;
  value: string;
};

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-base-content/60">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function TagList({ tags }: { tags: Record<string, string> }) {
  const entries = Object.entries(tags);
  if (entries.length === 0) {
    return <p className="text-sm text-base-content/60">No tags available.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span key={key} className="badge badge-outline badge-sm font-normal">
          {key}: {value}
        </span>
      ))}
    </div>
  );
}

export function TrailDetailPanel({ feature, onClose }: TrailDetailPanelProps) {
  const { t } = useTranslation();
  const stats = analyzeTrailFeature(feature);

  return (
    <aside
      data-test="trail-detail-panel"
      className="flex h-full w-full flex-col border-l border-base-300 bg-base-100/95 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3 border-b border-base-300 p-4">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-lg font-semibold">{stats.name}</h2>
          {stats.slug ? (
            <p className="truncate text-xs text-base-content/60">{stats.slug}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-square btn-ghost btn-sm"
          onClick={onClose}
          aria-label={t("home.playground.closeDetails")}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 p-4">
          <div className="flex flex-wrap gap-2">
            {stats.source ? <span className="badge badge-outline">{stats.source}</span> : null}
            {stats.difficulty ? (
              <span className="badge badge-primary">{stats.difficulty}</span>
            ) : null}
            {stats.activityType ? (
              <span className="badge badge-secondary">{stats.activityType}</span>
            ) : null}
            {stats.trailType ? <span className="badge badge-accent">{stats.trailType}</span> : null}
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide text-base-content/70 uppercase">
              {t("home.playground.route")}
            </h3>
            <div className="glass-card space-y-2 p-3">
              <StatRow
                label={t("home.playground.length")}
                value={formatDistance(stats.lengthMeters)}
              />
              <StatRow label={t("home.playground.vertices")} value={String(stats.vertexCount)} />
              <StatRow label={t("home.playground.direction")} value={stats.direction ?? "—"} />
              <StatRow label={t("home.playground.usage")} value={stats.usage ?? "—"} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide text-base-content/70 uppercase">
              {t("home.playground.elevation")}
            </h3>
            <div className="glass-card space-y-2 p-3">
              <StatRow
                label={t("home.playground.min")}
                value={formatElevation(stats.elevation.min)}
              />
              <StatRow
                label={t("home.playground.max")}
                value={formatElevation(stats.elevation.max)}
              />
              <StatRow
                label={t("home.playground.gain")}
                value={formatElevation(stats.elevation.gain ?? stats.altClimbMeters)}
              />
              <StatRow
                label={t("home.playground.loss")}
                value={formatElevation(
                  stats.elevation.loss ??
                    (stats.altDescentMeters !== null ? Math.abs(stats.altDescentMeters) : null),
                )}
              />
              <StatRow
                label={t("home.playground.samples")}
                value={String(stats.elevation.sampleCount)}
              />
            </div>
          </section>

          {(stats.avgTimeSeconds !== null ||
            stats.popularityScore !== null ||
            stats.globalRank !== null) && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wide text-base-content/70 uppercase">
                Trailfork
              </h3>
              <div className="glass-card space-y-2 p-3">
                {stats.trailforkId !== null ? (
                  <StatRow label={t("home.playground.trailId")} value={String(stats.trailforkId)} />
                ) : null}
                <StatRow
                  label={t("home.playground.avgTime")}
                  value={formatDuration(stats.avgTimeSeconds)}
                />
                <StatRow
                  label={t("home.playground.popularity")}
                  value={stats.popularityScore !== null ? String(stats.popularityScore) : "—"}
                />
                <StatRow
                  label={t("home.playground.globalRank")}
                  value={stats.globalRank !== null ? String(stats.globalRank) : "—"}
                />
              </div>
            </section>
          )}

          {Object.keys(stats.osmTags).length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wide text-base-content/70 uppercase">
                {t("home.playground.osmTags")}
              </h3>
              <TagList tags={stats.osmTags} />
            </section>
          ) : null}

          {Object.keys(stats.sourceFiles).length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wide text-base-content/70 uppercase">
                {t("home.playground.sources")}
              </h3>
              <pre className="overflow-x-auto rounded-lg border border-base-300 bg-base-200/40 p-3 text-xs">
                {JSON.stringify(stats.sourceFiles, null, 2)}
              </pre>
            </section>
          ) : null}

          {stats.warnings.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wide text-base-content/70 uppercase">
                {t("home.playground.warnings")}
              </h3>
              <ul className="space-y-1 text-sm text-warning">
                {stats.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="divider my-0" />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide text-base-content/70 uppercase">
              {t("home.playground.allProperties")}
            </h3>
            <pre className="max-h-64 overflow-auto rounded-lg border border-base-300 bg-base-200/40 p-3 text-xs">
              {JSON.stringify(stats.properties, null, 2)}
            </pre>
          </section>
        </div>
      </div>

      {stats.trailforkUrl ? (
        <div className="border-t border-base-300 p-4">
          <a
            href={stats.trailforkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-block btn-outline"
          >
            {t("home.playground.viewOnTrailfork")}
            <ExternalLink className="size-4" />
          </a>
        </div>
      ) : null}
    </aside>
  );
}
