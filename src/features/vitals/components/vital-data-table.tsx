import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { classify, formatVital, severityLabel, VITALS } from "../lib/definitions";
import type { ChartSeries } from "./vital-chart";

const TONE = { normal: "text-muted-foreground", elevated: "text-elevated", critical: "text-critical" } as const;

/** The chart's data as a real table: the keyboard and screen-reader alternative. */
export function VitalDataTable({ series, caption }: { series: ChartSeries[]; caption: string }) {
  const [primary, ...rest] = series;
  const rows = [...primary.points].reverse();
  const lookups = rest.map((s) => new Map(s.points.map((p) => [p.t, p.value])));

  return (
    <div
      className="max-h-60 overflow-auto rounded-md border focus-visible:outline-2"
      tabIndex={0}
      role="region"
      aria-label={`${caption}, scrollable`}
    >
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Date
            </th>
            {series.map((s) => (
              <th key={s.type} scope="col" className="px-3 py-2 text-right font-medium">
                {VITALS[s.type].label} ({VITALS[s.type].unit})
              </th>
            ))}
            <th scope="col" className="px-3 py-2 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((p) => {
            const values = [p.value, ...lookups.map((m) => m.get(p.t))];
            const classes = series.map((s, i) => (values[i] === undefined ? null : classify(s.type, values[i] as number)));
            const worst = classes.find((c) => c?.severity === "critical") ?? classes.find((c) => c?.severity === "elevated") ?? classes[0];
            return (
              <tr key={p.t}>
                <th scope="row" className="num px-3 py-1.5 text-left font-normal whitespace-nowrap">
                  {formatDateTime(p.t)}
                </th>
                {series.map((s, i) => (
                  <td key={s.type} className="num px-3 py-1.5 text-right">
                    {values[i] === undefined ? "—" : formatVital(s.type, values[i] as number)}
                  </td>
                ))}
                <td className={cn("px-3 py-1.5 whitespace-nowrap", worst && TONE[worst.severity])}>{worst ? severityLabel(worst) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
