"use client";

import { ChevronDownIcon, ClipboardListIcon } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Fragment, useOptimistic, useState, useTransition } from "react";
import { EmptyState } from "@/components/feedback/states";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DIAGNOSIS_STATUSES, type Diagnosis, type DiagnosisStatus, STATUS_LABELS } from "../schemas";
import { changeDiagnosisStatus } from "../server/actions";

const FILTERS = ["all", ...DIAGNOSIS_STATUSES] as const;
type Filter = (typeof FILTERS)[number];
const TONE: Record<DiagnosisStatus, BadgeTone> = { active: "accent", under_observation: "elevated", resolved: "neutral" };

export function DiagnosesTable({ patientId, diagnoses }: { patientId: string; diagnoses: Diagnosis[] }) {
  const [filter, setFilter] = useQueryState("status", parseAsStringLiteral(FILTERS).withDefault("all").withOptions({ history: "replace" }));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Status changes appear instantly and roll back automatically if the action fails.
  const [optimistic, setOptimistic] = useOptimistic(diagnoses, (list, next: { id: string; status: DiagnosisStatus }) =>
    list.map((d) => (d.id === next.id ? { ...d, status: next.status } : d)),
  );

  const counts = Object.fromEntries(DIAGNOSIS_STATUSES.map((s) => [s, optimistic.filter((d) => d.status === s).length]));
  const rows = filter === "all" ? optimistic : optimistic.filter((d) => d.status === filter);

  const onStatus = (d: Diagnosis, status: DiagnosisStatus) =>
    startTransition(async () => {
      setError(null);
      setOptimistic({ id: d.id, status });
      const res = await changeDiagnosisStatus({ diagnosisId: d.id, patientId, status });
      if (!res.ok) setError(res.error);
    });

  return (
    <Card aria-labelledby="dx-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h2 id="dx-heading" className="text-base font-semibold">
          Diagnoses
        </h2>
        <SegmentedControl<Filter>
          label="Filter by status"
          value={filter}
          onValueChange={(v) => void setFilter(v)}
          options={FILTERS.map((f) => ({
            value: f,
            label: f === "all" ? `All ${optimistic.length}` : `${STATUS_LABELS[f]} ${counts[f]}`,
          }))}
          className="max-w-full overflow-x-auto"
        />
      </div>
      {error && (
        <p role="alert" className="mx-5 mb-3 rounded-md bg-critical-subtle px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}
      {rows.length === 0 ? (
        <EmptyState icon={ClipboardListIcon} title="No diagnoses with this status" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm" aria-busy={pending}>
            <thead className="border-y bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="w-8 px-3 py-2">
                  <span className="sr-only">History</span>
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Diagnosis
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Code
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Onset
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((d) => {
                const open = expanded === d.id;
                return (
                  <Fragment key={d.id}>
                    <tr className={cn(open && "bg-muted/40")}>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => setExpanded(open ? null : d.id)}
                          aria-expanded={open}
                          aria-controls={`dx-history-${d.id}`}
                          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                        >
                          <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
                          <span className="sr-only">{open ? "Hide" : "Show"} history for {d.name}</span>
                        </button>
                      </td>
                      <th scope="row" className="px-3 py-2.5 text-left font-normal">
                        <span className="block font-medium">{d.name}</span>
                        <span className="block text-muted-foreground">{d.description}</span>
                      </th>
                      <td className="num px-3 py-2.5 text-muted-foreground">{d.code}</td>
                      <td className="num px-3 py-2.5 whitespace-nowrap">
                        {formatDate(`${d.onset_date}T00:00:00Z`)}
                        {d.resolved_date && <span className="block text-xs text-muted-foreground">Resolved {formatDate(`${d.resolved_date}T00:00:00Z`)}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <Select value={d.status} onValueChange={(v) => onStatus(d, v as DiagnosisStatus)}>
                          <SelectTrigger className="h-7 w-auto gap-1.5 border-none bg-transparent px-0 shadow-none" aria-label={`Status of ${d.name}`}>
                            <Badge tone={TONE[d.status]}>
                              <SelectValue />
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {DIAGNOSIS_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                    {open && (
                      <tr id={`dx-history-${d.id}`} className="bg-muted/40">
                        <td />
                        <td colSpan={4} className="px-3 pb-4">
                          <ol className="space-y-2 border-l pl-4" aria-label={`${d.name} history`}>
                            {d.diagnosis_events.map((ev) => (
                              <li key={ev.id} className="relative">
                                <span className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-primary" aria-hidden />
                                <p className="text-sm">
                                  <span className="font-medium">
                                    {ev.event_type === "diagnosed"
                                      ? "Diagnosed"
                                      : ev.event_type === "status_changed"
                                        ? `${ev.from_status ? STATUS_LABELS[ev.from_status] : "—"} → ${ev.to_status ? STATUS_LABELS[ev.to_status] : "—"}`
                                        : "Note"}
                                  </span>
                                  <time dateTime={ev.occurred_at} suppressHydrationWarning className="num ml-2 text-xs text-muted-foreground">
                                    {formatDateTime(ev.occurred_at)}
                                  </time>
                                </p>
                                {ev.note && <p className="text-sm text-muted-foreground">{ev.note}</p>}
                              </li>
                            ))}
                          </ol>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
