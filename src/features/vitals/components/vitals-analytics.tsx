"use client";

import { GitCompareArrowsIcon } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback/states";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useVitalsRange } from "../hooks/use-vitals-range";
import { KIND_META, VITAL_KINDS } from "../lib/definitions";
import { type DateRange, PRESET_LABELS, presetRange, previousPeriod } from "../lib/ranges";
import { vitalsParsers, type VitalsRange } from "../lib/search-params";
import { alignToPeriod, downsampleDaily, seriesFor, trend } from "../lib/series";
import { VitalPanel } from "./vital-panel";

const RANGE_OPTIONS = [
  { value: "3m", label: PRESET_LABELS["3m"] },
  { value: "6m", label: PRESET_LABELS["6m"] },
  { value: "12m", label: PRESET_LABELS["12m"] },
  { value: "custom", label: "Custom" },
] as const;

const toInput = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Range, custom dates and compare mode live in the URL, so any view is shareable.
 * "now" is pinned on mount: re-deriving it every render would shift the range by
 * milliseconds and produce new cache keys for the current month.
 */
export function VitalsAnalytics({ patientId, live }: { patientId: string; live?: React.ReactNode }) {
  const [{ range, from, to, compare }, setParams] = useQueryStates(vitalsParsers, { history: "replace" });
  const [now] = useState(() => new Date());

  const current: DateRange | null = useMemo(() => {
    if (range !== "custom") return presetRange(range, now);
    if (!from || !to || from > to) return null;
    return { from, to: new Date(to.getTime() + 86_399_999) };
  }, [range, from, to, now]);

  const previous = current && compare ? previousPeriod(current) : null;
  const data = useVitalsRange(patientId, current);
  const prevData = useVitalsRange(patientId, previous);

  const onRange = (next: VitalsRange) => {
    if (next === "custom") {
      const fallback = presetRange("3m", now);
      void setParams({ range: next, from: from ?? fallback.from, to: to ?? now });
    } else {
      void setParams({ range: next, from: null, to: null });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl label="Time range" value={range} onValueChange={onRange} options={RANGE_OPTIONS} />
        {range === "custom" && (
          <div className="flex items-center gap-2 text-sm">
            <label className="sr-only" htmlFor="range-from">
              From
            </label>
            <Input
              id="range-from"
              type="date"
              className="h-8 w-auto"
              value={from ? toInput(from) : ""}
              max={to ? toInput(to) : toInput(now)}
              onChange={(e) => void setParams({ from: e.target.valueAsDate })}
            />
            <span aria-hidden className="text-muted-foreground">
              –
            </span>
            <label className="sr-only" htmlFor="range-to">
              To
            </label>
            <Input
              id="range-to"
              type="date"
              className="h-8 w-auto"
              value={to ? toInput(to) : ""}
              min={from ? toInput(from) : undefined}
              max={toInput(now)}
              onChange={(e) => void setParams({ to: e.target.valueAsDate })}
            />
          </div>
        )}
        <button
          type="button"
          aria-pressed={compare}
          onClick={() => void setParams({ compare: !compare })}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            compare && "border-primary bg-accent text-accent-foreground",
          )}
        >
          <GitCompareArrowsIcon className="size-4" aria-hidden />
          Compare with previous period
        </button>
        <div className="ml-auto flex items-center gap-3">
          <p className="num text-xs text-muted-foreground" aria-live="polite">
            {data.isFetching ? `Loading ${data.monthsLoaded}/${data.monthsTotal} months…` : `${data.readings.length.toLocaleString()} readings`}
          </p>
          {live}
        </div>
      </div>

      {!current ? (
        <p role="alert" className="text-sm text-critical">
          Choose a valid date range: the start date must be before the end date.
        </p>
      ) : data.isError ? (
        <ErrorState className="card-surface" description="Some months of readings failed to load." onRetry={() => void data.refetch()} />
      ) : data.isLoading ? (
        <div className="grid gap-5 lg:grid-cols-2" role="status" aria-label="Loading vitals">
          {VITAL_KINDS.map((k) => (
            <Skeleton key={k} className={cn("h-[26rem] rounded-lg", k === "blood_pressure" && "lg:col-span-2")} />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {VITAL_KINDS.map((kind) => {
            const types = KIND_META[kind].types;
            const series = types.map((type) => ({ type, points: downsampleDaily(seriesFor(data.readings, type), type) }));
            const cmp =
              previous && !prevData.isLoading
                ? types.map((type) => ({
                    type,
                    points: alignToPeriod(downsampleDaily(seriesFor(prevData.readings, type), type), previous, current),
                  }))
                : undefined;
            return (
              <VitalPanel
                key={kind}
                kind={kind}
                series={series}
                compare={cmp}
                trend={trend(seriesFor(data.readings, types[0]), types[0], current.to.getTime())}
                className={kind === "blood_pressure" ? "lg:col-span-2" : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
