import { curveMonotoneX } from "@visx/curve";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { classify, VITALS, type VitalType } from "../lib/definitions";
import type { Point } from "../lib/series";

type SparklineProps = {
  points: readonly Point[];
  type: VitalType;
  /** Optional second series drawn dashed (e.g. diastolic under systolic). */
  secondary?: { points: readonly Point[]; type: VitalType };
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Pure SVG sparkline with no client JS, so it can render in Server Components.
 * The shaded band is the normal reference range; out-of-range points get a dot
 * in the matching clinical colour.
 */
export function Sparkline({ points, type, secondary, width = 132, height = 36, className }: SparklineProps) {
  const all = secondary ? [...points, ...secondary.points] : points;
  if (all.length < 2) {
    return <svg width={width} height={height} className={className} aria-hidden />;
  }

  const pad = 3;
  const { low, high } = VITALS[type].thresholds;
  const secondaryBand = secondary ? VITALS[secondary.type].thresholds : null;
  const values = all.map((p) => p.value);
  const yMin = Math.min(...values, secondaryBand?.low ?? low, low);
  const yMax = Math.max(...values, high);
  const span = yMax - yMin || 1;

  const ts = all.map((p) => p.t);
  const x = scaleLinear({ domain: [Math.min(...ts), Math.max(...ts)], range: [pad, width - pad] });
  const y = scaleLinear({ domain: [yMin - span * 0.08, yMax + span * 0.08], range: [height - pad, pad] });

  const bandFor = (t: VitalType) => {
    const th = VITALS[t].thresholds;
    const top = y(Math.min(th.high, yMax + span));
    return { y: top, h: Math.max(0, y(th.low) - top) };
  };
  const band = bandFor(type);
  const flagged = (series: readonly Point[], t: VitalType) =>
    series.map((p) => ({ p, s: classify(t, p.value).severity })).filter((d) => d.s !== "normal");

  const last = points.at(-1);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <rect x={0} y={band.y} width={width} height={band.h} rx={2} fill="var(--chart-band)" />
      {secondary && (
        <LinePath
          data={secondary.points as Point[]}
          x={(d) => x(d.t)}
          y={(d) => y(d.value)}
          curve={curveMonotoneX}
          stroke="var(--chart-secondary)"
          strokeWidth={1.25}
          strokeDasharray="3 2"
          fill="none"
        />
      )}
      <LinePath
        data={points as Point[]}
        x={(d) => x(d.t)}
        y={(d) => y(d.value)}
        curve={curveMonotoneX}
        stroke="var(--chart-primary)"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {[...flagged(points, type), ...(secondary ? flagged(secondary.points, secondary.type) : [])].map(({ p, s }) => (
        <circle
          key={`${p.t}-${p.value}`}
          cx={x(p.t)}
          cy={y(p.value)}
          r={1.8}
          fill={s === "critical" ? "var(--status-critical)" : "var(--status-elevated)"}
        />
      ))}
      {last && <circle cx={x(last.t)} cy={y(last.value)} r={2.6} fill="var(--chart-primary)" stroke="var(--card)" strokeWidth={1.5} />}
    </svg>
  );
}
