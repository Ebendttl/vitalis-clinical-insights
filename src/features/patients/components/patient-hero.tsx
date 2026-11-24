"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { rememberPatient } from "@/features/command-palette/lib/recent-patients";
import { RiskRing } from "@/features/vitals/components/risk-ring";
import { VitalTile } from "@/features/vitals/components/vital-tile";
import { ageFromDob } from "@/features/vitals/lib/risk";
import { liveKey, recentVitalsKey } from "@/features/vitals/lib/query-keys";
import { buildSnapshot, latestTimestamp } from "@/features/vitals/lib/snapshot";
import type { VitalReading } from "@/features/vitals/schemas";
import { formatSex } from "@/lib/format";
import type { PatientDetail } from "../schemas";
import { PatientAvatar } from "./patient-avatar";

type HeroPatient = Pick<PatientDetail, "id" | "full_name" | "mrn" | "date_of_birth" | "sex" | "blood_type" | "conditions">;

/**
 * The signature header: identity, live risk ring and a tile per vital with a
 * 90-day sparkline. Readings live in the query cache so Realtime inserts
 * (see use-live-vitals) re-derive every tile and the risk score in place.
 */
export function PatientHero({
  patient,
  initialReadings,
  chronicConditionCount,
}: {
  patient: HeroPatient;
  initialReadings: VitalReading[];
  chronicConditionCount: number;
}) {
  const { data: readings = initialReadings } = useQuery({
    queryKey: recentVitalsKey(patient.id),
    queryFn: () => initialReadings,
    initialData: initialReadings,
    staleTime: Infinity,
  });
  // Set by the live demo (use-live-vitals) so tiles can show a pulsing "live" dot.
  const { data: live = false } = useQuery({ queryKey: liveKey(patient.id), queryFn: () => false, initialData: false, staleTime: Infinity });

  const age = ageFromDob(patient.date_of_birth);
  const snapshot = useMemo(
    // Trend windows are anchored to the newest reading, not the wall clock: identical on
    // server and client (no hydration drift) and they advance as live readings arrive.
    () => buildSnapshot(readings, { ageYears: age, activeChronicConditions: chronicConditionCount }, latestTimestamp(readings)),
    [readings, age, chronicConditionCount],
  );

  useEffect(() => {
    rememberPatient({ id: patient.id, name: patient.full_name, mrn: patient.mrn });
  }, [patient.id, patient.full_name, patient.mrn]);

  return (
    <section aria-labelledby="patient-name" className="card-surface overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <PatientAvatar name={patient.full_name} size="lg" />
          <div className="min-w-0 space-y-1">
            <h1 id="patient-name" className="truncate text-2xl font-semibold tracking-tight">
              {patient.full_name}
            </h1>
            <p className="num text-sm text-muted-foreground">
              {age} yrs · {formatSex(patient.sex)} · {patient.mrn}
              {patient.blood_type && ` · ${patient.blood_type}`}
            </p>
            {patient.conditions.length > 0 && (
              <ul className="flex flex-wrap gap-1 pt-0.5" aria-label="Active conditions">
                {patient.conditions.map((c) => (
                  <li key={c} className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <RiskRing risk={snapshot.risk} />
      </div>

      <h2 className="sr-only">Latest vitals</h2>
      <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto border-t p-1.5 md:grid md:grid-cols-3 md:overflow-visible xl:grid-cols-5">
        {snapshot.kinds.map((k) => (
          <VitalTile key={k.kind} snapshot={k} href={`/patients/${patient.id}/vitals#${k.kind}`} live={live} />
        ))}
      </div>
    </section>
  );
}
