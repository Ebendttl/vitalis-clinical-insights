"use client";

import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { classify, formatVital, KIND_META, severityLabel, VITALS, type VitalKind } from "../lib/definitions";
import { describeSeries } from "../lib/describe";
import { summarize, type Trend } from "../lib/series";
import { type ChartSeries, VitalChart } from "./vital-chart";
import { VitalDataTable } from "./vital-data-table";

const TONE = { normal: "normal", elevated: "elevated", critical: "critical" } as const;
const TREND_ICON = { up: ArrowUpRightIcon, down: ArrowDownRightIcon, stable: ArrowRightIcon };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="num truncate text-sm font-medium">
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}

export function VitalPanel({
  kind,
  series,
  compare,
  trend,
  className,
}: {
  kind: VitalKind;
  series: ChartSeries[];
  compare?: ChartSeries[];
  trend: Trend | null;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const meta = KIND_META[kind];
  const primary = series[0];
  const def = VITALS[primary.type];
  const summary = summarize(primary.points, primary.type);
  const previous = compare?.[0] ? summarize(compare[0].points, compare[0].type) : null;
  const latest = summary.latest;
  const secondaryLatest = series[1]?.points.at(-1);
  const classification = latest ? classify(primary.type, latest.value) : null;
  const f = (v: number | null) => (v === null ? "—" : formatVital(primary.type, v));
  const meanDelta = previous?.mean != null && summary.mean != null ? summary.mean - previous.mean : null;
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;

  return (
    <Card id={kind} aria-labelledby={`${kind}-title`} className={`scroll-mt-20 ${className ?? ""}`}>
      <CardHeader className="flex-wrap">
        <div className="space-y-1">
          <CardTitle id={`${kind}-title`}>{meta.label}</CardTitle>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="num text-2xl font-semibold tracking-tight">
              {latest ? (secondaryLatest ? `${f(latest.value)}/${formatVital(series[1].type, secondaryLatest.value)}` : f(latest.value)) : "—"}
            </span>
            <span className="text-sm text-muted-foreground">{meta.unit}</span>
            {classification && <Badge tone={TONE[classification.severity]}>{severityLabel(classification)}</Badge>}
            {TrendIcon && trend && (
              <span className="num inline-flex items-center gap-0.5 text-xs text-muted-foreground" title="Last 7 days vs prior 30-day average">
                <TrendIcon className="size-3.5" aria-hidden />
                {trend.direction === "stable" ? "Stable" : `${trend.delta > 0 ? "+" : ""}${formatVital(primary.type, trend.delta)} vs 30d`}
              </span>
            )}
          </p>
        </div>
        <SegmentedControl
          label={`${meta.label} view`}
          value={view}
          onValueChange={setView}
          options={[
            { value: "chart", label: "Chart" },
            { value: "table", label: "Table" },
          ]}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Average"
            value={`${f(summary.mean)} ${def.unit}`}
            hint={meanDelta !== null ? `${meanDelta >= 0 ? "+" : ""}${formatVital(primary.type, meanDelta)} vs prev.` : undefined}
          />
          <Stat label="Range" value={summary.min === null ? "—" : `${f(summary.min)}–${f(summary.max)}`} />
          <Stat
            label="Out of range"
            value={`${summary.outOfRange}`}
            hint={summary.count ? `${Math.round((summary.outOfRange / summary.count) * 100)}%` : undefined}
          />
          <Stat label="Readings" value={`${summary.count}`} hint={previous ? `prev. ${previous.count}` : undefined} />
        </dl>

        {primary.points.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No readings in this period.</p>
        ) : view === "chart" ? (
          <>
            <VitalChart series={series} compare={compare} label={meta.label} summary={describeSeries(primary.type, primary.points, summary)} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden>
              {series.map((s, i) => (
                <span key={s.type} className="inline-flex items-center gap-1.5">
                  <svg width="18" height="6">
                    <line x1="0" x2="18" y1="3" y2="3" stroke={i === 0 ? "var(--chart-primary)" : "var(--chart-secondary)"} strokeWidth="2" strokeDasharray={i === 0 ? undefined : "5 3"} />
                  </svg>
                  {VITALS[s.type].label}
                </span>
              ))}
              {compare && (
                <span className="inline-flex items-center gap-1.5">
                  <svg width="18" height="6">
                    <line x1="0" x2="18" y1="3" y2="3" stroke="var(--chart-compare)" strokeWidth="2" strokeDasharray="4 3" />
                  </svg>
                  Previous period
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-4 rounded-sm bg-(--chart-band) ring-1 ring-normal/30" /> Normal range
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-elevated" /> Out of range
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-critical" /> Critical
              </span>
            </div>
          </>
        ) : (
          <VitalDataTable series={series} caption={`${meta.label} readings`} />
        )}
      </CardContent>
    </Card>
  );
}
