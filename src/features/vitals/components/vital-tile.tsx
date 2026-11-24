import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatVital, severityLabel } from "../lib/definitions";
import type { KindSnapshot } from "../lib/snapshot";
import { Sparkline } from "./sparkline";

const SEVERITY_TEXT = { normal: "text-normal", elevated: "text-elevated", critical: "text-critical" } as const;
const SEVERITY_DOT = { normal: "bg-normal", elevated: "bg-elevated", critical: "bg-critical" } as const;
const TREND_ICON = { up: ArrowUpRightIcon, down: ArrowDownRightIcon, stable: ArrowRightIcon } as const;

export function VitalTile({ snapshot, href, live = false }: { snapshot: KindSnapshot; href: string; live?: boolean }) {
  const { latest, classification, trend, primaryType, secondaryType, label, unit } = snapshot;
  const value = latest
    ? secondaryType && latest.secondary !== undefined
      ? `${formatVital(primaryType, latest.value)}/${formatVital(secondaryType, latest.secondary)}`
      : formatVital(primaryType, latest.value)
    : "—";
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;
  const delta = trend ? `${trend.delta > 0 ? "+" : ""}${formatVital(primaryType, trend.delta)}` : null;
  const status = severityLabel(classification);

  const spoken = latest
    ? `${label} ${value.replace("/", " over ")} ${unit}, ${status}${trend ? `, ${trend.direction === "stable" ? "stable" : `trending ${trend.direction} by ${delta?.replace("+", "")}`} versus 30-day average` : ""}.`
    : `${label}: no recent readings.`;

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-w-[11.5rem] snap-start flex-col gap-2 rounded-lg p-3.5 transition-colors duration-(--duration-fast) hover:bg-muted/70 focus-visible:bg-accent",
        classification.severity === "critical" && "bg-critical-subtle/60",
      )}
    >
      <span className="sr-only">{spoken}</span>
      <span aria-hidden className="flex items-center justify-between text-xs text-muted-foreground">
        {label}
        {live && <span className="size-1.5 animate-pulse-dot rounded-full bg-primary" />}
      </span>
      <span aria-hidden className="flex items-baseline gap-1">
        <span key={value} className="num animate-fade-in text-2xl font-semibold tracking-tight">
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </span>
      <span aria-hidden className="h-9">
        <Sparkline
          points={snapshot.series}
          type={primaryType}
          secondary={secondaryType && snapshot.secondarySeries ? { points: snapshot.secondarySeries, type: secondaryType } : undefined}
          width={160}
          height={36}
          className="h-9 w-full"
        />
      </span>
      <span aria-hidden className="flex items-center justify-between gap-2 text-xs">
        <span className={cn("inline-flex items-center gap-1.5 font-medium", SEVERITY_TEXT[classification.severity])}>
          <span className={cn("size-1.5 rounded-full", SEVERITY_DOT[classification.severity])} />
          {latest ? status : "No data"}
        </span>
        {TrendIcon && (
          <span className="num inline-flex items-center gap-0.5 text-muted-foreground" title="Last 7 days vs prior 30-day average">
            <TrendIcon className="size-3.5" />
            {trend?.direction === "stable" ? "Stable" : delta}
          </span>
        )}
      </span>
      {latest && (
        <time aria-hidden dateTime={latest.recordedAt} suppressHydrationWarning className="text-[0.6875rem] text-muted-foreground">
          {formatRelative(latest.recordedAt)}
        </time>
      )}
    </Link>
  );
}
