"use client";

import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { ageFromDob } from "@/features/vitals/lib/risk";
import { formatRelative, formatSex } from "@/lib/format";
import type { DirectoryPatient } from "../schemas";
import { PatientAvatar } from "./patient-avatar";
import { RiskBadge } from "./risk-badge";

const ROW_ESTIMATE = 68;
const GRID = "md:grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,2fr)_7.5rem_6.5rem_1rem]";

/**
 * Window-virtualised list: only rows near the viewport are in the DOM, so 5,000
 * patients scroll as smoothly as 50. aria-setsize/posinset tell screen readers the
 * true list length even though most rows aren't rendered.
 */
export function PatientList({ patients }: { patients: DirectoryPatient[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    setScrollMargin(listRef.current?.offsetTop ?? 0);
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: patients.length,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 8,
    scrollMargin,
  });

  return (
    <div className="card-surface overflow-hidden">
      <div
        aria-hidden
        className={`hidden gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground md:grid ${GRID}`}
      >
        <span>Patient</span>
        <span>Age · Sex</span>
        <span>Active conditions</span>
        <span>Risk</span>
        <span>Last reading</span>
        <span />
      </div>
      <ul
        ref={listRef}
        aria-label="Patients"
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const p = patients[item.index];
          return (
            <li
              key={p.id}
              data-index={item.index}
              ref={virtualizer.measureElement}
              aria-setsize={patients.length}
              aria-posinset={item.index + 1}
              className="absolute inset-x-0 top-0"
              style={{ transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)` }}
            >
              <Link
                href={`/patients/${p.id}`}
                prefetch={false}
                className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b px-4 py-3 transition-colors duration-(--duration-fast) hover:bg-muted/60 focus-visible:bg-accent focus-visible:outline-none ${GRID}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <PatientAvatar name={p.full_name} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.full_name}</span>
                    <span className="num block text-xs text-muted-foreground">{p.mrn}</span>
                  </span>
                </span>
                <span className="num col-start-1 text-sm text-muted-foreground md:col-start-auto">
                  {ageFromDob(p.date_of_birth)} · {formatSex(p.sex)}
                </span>
                <span className="col-start-1 flex min-w-0 flex-wrap gap-1 md:col-start-auto">
                  {p.conditions.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
                  {p.conditions.slice(0, 2).map((c) => (
                    <span key={c} className="truncate rounded-md bg-muted px-1.5 py-0.5 text-xs">
                      {c}
                    </span>
                  ))}
                  {p.conditions.length > 2 && (
                    <span className="rounded-md px-1 py-0.5 text-xs text-muted-foreground">+{p.conditions.length - 2}</span>
                  )}
                </span>
                <span className="col-start-2 row-span-2 row-start-1 justify-self-end md:col-start-auto md:row-span-1 md:row-start-auto md:justify-self-start">
                  <RiskBadge level={p.risk_level} score={p.risk_score} />
                </span>
                <span className="hidden text-sm text-muted-foreground md:block">
                  {p.last_reading_at ? (
                    <time dateTime={p.last_reading_at} suppressHydrationWarning>
                      {formatRelative(p.last_reading_at)}
                    </time>
                  ) : (
                    "—"
                  )}
                </span>
                <ChevronRightIcon
                  className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 md:block"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
