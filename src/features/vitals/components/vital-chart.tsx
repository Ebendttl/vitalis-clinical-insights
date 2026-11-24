"use client";

import { AxisBottom, AxisLeft } from "@visx/axis";
import { curveMonotoneX } from "@visx/curve";
import { Group } from "@visx/group";
import { scaleLinear, scaleTime } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { type KeyboardEvent, type PointerEvent, useId, useMemo, useState } from "react";
import { useElementWidth } from "@/hooks/use-element-width";
import { formatDate, formatMonth } from "@/lib/format";
import { classify, formatVital, severityLabel, VITALS, type VitalType } from "../lib/definitions";
import type { Point } from "../lib/series";

export type ChartSeries = { type: VitalType; points: Point[] };

type Props = {
  series: ChartSeries[];
  compare?: ChartSeries[];
  height?: number;
  label: string;
  /** Text alternative read before the interactive region. */
  summary: string;
};

const MARGIN = { top: 12, right: 12, bottom: 28, left: 40 };
const SEVERITY_FILL = { elevated: "var(--status-elevated)", critical: "var(--status-critical)" } as const;

function nearestIndex(points: Point[], t: number): number {
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(points[lo - 1].t - t) < Math.abs(points[lo].t - t)) return lo - 1;
  return lo;
}

/**
 * Line chart with clinical reference bands, out-of-range markers and an optional
 * previous-period overlay. Keyboard: focus the plot, then ←/→ (Home/End) to step
 * through readings; each step is announced via a polite live region.
 */
export function VitalChart({ series, compare, height = 240, label, summary }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [cursor, setCursor] = useState<number | null>(null);
  const summaryId = useId();
  const primary = series[0];

  const scales = useMemo(() => {
    const all = [...series, ...(compare ?? [])].flatMap((s) => s.points);
    const [d0, d1] = VITALS[primary.type].domain;
    const values = all.map((p) => p.value);
    const yMin = Math.min(d0, ...values);
    const yMax = Math.max(...series.map((s) => VITALS[s.type].thresholds.high), ...values, d0 + 1);
    const tMin = Math.min(...primary.points.map((p) => p.t), ...(compare?.flatMap((s) => s.points.map((p) => p.t)) ?? []));
    const tMax = Math.max(...primary.points.map((p) => p.t));
    const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
    const innerH = height - MARGIN.top - MARGIN.bottom;
    return {
      innerW,
      innerH,
      x: scaleTime({ domain: [new Date(tMin), new Date(tMax)], range: [0, innerW] }),
      y: scaleLinear({ domain: [yMin, Math.min(yMax, d1 * 1.15)], range: [innerH, 0], nice: true }),
    };
  }, [series, compare, primary, width, height]);

  if (primary.points.length === 0) return null;
  const { x, y, innerW, innerH } = scales;
  const active = cursor !== null ? primary.points[cursor] : null;
  const valuesAt = (t: number) =>
    series.map((s) => ({ type: s.type, value: s.points.find((p) => p.t === t)?.value })).filter((v) => v.value !== undefined) as Array<{
      type: VitalType;
      value: number;
    }>;

  const announce = active
    ? `${formatDate(active.t)}: ${valuesAt(active.t)
        .map((v) => `${VITALS[v.type].label} ${formatVital(v.type, v.value)} ${VITALS[v.type].unit}, ${severityLabel(classify(v.type, v.value))}`)
        .join("; ")}`
    : "";

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = primary.points.length - 1;
    const next =
      e.key === "ArrowRight" ? Math.min(last, (cursor ?? -1) + 1)
      : e.key === "ArrowLeft" ? Math.max(0, (cursor ?? last + 1) - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : e.key === "Escape" ? null
      : undefined;
    if (next === undefined) return;
    e.preventDefault();
    setCursor(next);
  };

  const onPointer = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursor(nearestIndex(primary.points, x.invert(e.clientX - rect.left).getTime()));
  };

  const tooltipLeft = active ? Math.min(Math.max(x(active.t) + MARGIN.left, 70), width - 70) : 0;

  return (
    <figure className="m-0">
      <figcaption id={summaryId} className="sr-only">
        {summary}
      </figcaption>
      <div
        ref={ref}
        // Focusable plot region; role="group" keeps it out of application mode for screen readers.
        role="group"
        tabIndex={0}
        aria-label={`${label} chart. Use left and right arrow keys to step through readings.`}
        aria-describedby={summaryId}
        onKeyDown={onKey}
        onBlur={() => setCursor(null)}
        className="relative rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{ height }}
      >
        {width > 0 && (
          <svg width={width} height={height} aria-hidden className="overflow-visible">
            <Group left={MARGIN.left} top={MARGIN.top}>
              {y.ticks(4).map((tick) => (
                <line key={tick} x1={0} x2={innerW} y1={y(tick)} y2={y(tick)} stroke="var(--chart-grid)" />
              ))}
              {series.map((s) => {
                const th = VITALS[s.type].thresholds;
                const top = y(th.high);
                return <rect key={`band-${s.type}`} x={0} width={innerW} y={top} height={Math.max(0, y(th.low) - top)} fill="var(--chart-band)" />;
              })}
              {series.flatMap((s) => {
                const th = VITALS[s.type].thresholds;
                return [th.criticalHigh, th.criticalLow]
                  .filter((v) => v > y.domain()[0] && v < y.domain()[1] && s.type !== "spo2")
                  .map((v) => (
                    <line
                      key={`crit-${s.type}-${v}`}
                      x1={0}
                      x2={innerW}
                      y1={y(v)}
                      y2={y(v)}
                      stroke="var(--status-critical)"
                      strokeOpacity={0.35}
                      strokeDasharray="2 4"
                    />
                  ));
              })}
              {compare?.map((s, i) => (
                <LinePath
                  key={`cmp-${s.type}`}
                  data={s.points}
                  x={(d) => x(d.t)}
                  y={(d) => y(d.value)}
                  curve={curveMonotoneX}
                  stroke="var(--chart-compare)"
                  strokeWidth={1.25}
                  strokeDasharray={i === 0 ? "4 3" : "1 3"}
                />
              ))}
              {series.map((s, i) => (
                <LinePath
                  key={`line-${s.type}`}
                  data={s.points}
                  x={(d) => x(d.t)}
                  y={(d) => y(d.value)}
                  curve={curveMonotoneX}
                  stroke={i === 0 ? "var(--chart-primary)" : "var(--chart-secondary)"}
                  strokeWidth={i === 0 ? 1.75 : 1.5}
                  strokeDasharray={i === 0 ? undefined : "5 3"}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
              {series.flatMap((s) =>
                s.points.map((p) => {
                  const { severity } = classify(s.type, p.value);
                  if (severity === "normal") return null;
                  return <circle key={`${s.type}-${p.t}`} cx={x(p.t)} cy={y(p.value)} r={2.75} fill={SEVERITY_FILL[severity]} />;
                }),
              )}
              {active && (
                <g>
                  <line x1={x(active.t)} x2={x(active.t)} y1={0} y2={innerH} stroke="var(--foreground)" strokeOpacity={0.25} />
                  {valuesAt(active.t).map((v, i) => (
                    <circle
                      key={v.type}
                      cx={x(active.t)}
                      cy={y(v.value)}
                      r={4}
                      fill={i === 0 ? "var(--chart-primary)" : "var(--chart-secondary)"}
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                  ))}
                </g>
              )}
              <AxisLeft
                scale={y}
                numTicks={4}
                hideAxisLine
                hideTicks
                tickLabelProps={{ fill: "var(--muted-foreground)", fontSize: 11, textAnchor: "end", dx: -6, dy: 3, className: "num" }}
              />
              <AxisBottom
                scale={x}
                top={innerH}
                numTicks={Math.max(2, Math.floor(innerW / 90))}
                tickFormat={(d) => formatMonth(d as Date)}
                stroke="var(--border)"
                hideTicks
                tickLabelProps={{ fill: "var(--muted-foreground)", fontSize: 11, textAnchor: "middle", dy: 4 }}
              />
              <rect
                width={innerW}
                height={innerH}
                fill="transparent"
                onPointerMove={onPointer}
                onPointerLeave={() => setCursor(null)}
              />
            </Group>
          </svg>
        )}
        {active && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md bg-popover px-2.5 py-1.5 text-xs shadow-(--shadow-pop)"
            style={{ left: tooltipLeft }}
          >
            <p className="text-muted-foreground">{formatDate(active.t)}</p>
            {valuesAt(active.t).map((v) => (
              <p key={v.type} className="num font-medium">
                {VITALS[v.type].label} {formatVital(v.type, v.value)} {VITALS[v.type].unit}
              </p>
            ))}
          </div>
        )}
        <p aria-live="polite" className="sr-only">
          {announce}
        </p>
      </div>
    </figure>
  );
}
