import { STATUS_LABELS, type Diagnosis } from "@/features/diagnoses/schemas";
import type { LabReport } from "@/features/labs/schemas";
import { classify, formatVital, VITALS, type VitalType } from "@/features/vitals/lib/definitions";

export type TimelineItem = {
  id: string;
  at: string;
  kind: "diagnosis" | "lab" | "vital";
  tone: "neutral" | "elevated" | "critical" | "normal";
  title: string;
  detail?: string;
  href?: string;
};

type ReadingLike = { id: number; type: VitalType; value: number; recordedAt: string };

/**
 * Merges diagnosis history, lab results and critical vital readings into one
 * reverse-chronological feed. Critical readings are collapsed to one item per
 * vital per day so a multi-day episode doesn't flood the timeline.
 */
export function buildTimeline(
  input: { diagnoses: Diagnosis[]; labs: LabReport[]; readings: ReadingLike[]; patientId: string },
  limit = 12,
): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const dx of input.diagnoses) {
    for (const ev of dx.diagnosis_events) {
      const title =
        ev.event_type === "diagnosed"
          ? `${dx.name} diagnosed`
          : ev.event_type === "status_changed" && ev.to_status
            ? `${dx.name}: ${STATUS_LABELS[ev.to_status].toLowerCase()}`
            : `Note on ${dx.name}`;
      items.push({
        id: `dx-${ev.id}`,
        at: ev.occurred_at,
        kind: "diagnosis",
        tone: ev.to_status === "resolved" ? "normal" : "neutral",
        title,
        detail: ev.note ?? undefined,
        href: `/patients/${input.patientId}/diagnoses`,
      });
    }
  }

  for (const lab of input.labs) {
    const abnormal = lab.results.filter((r) => r.flag !== "normal").map((r) => r.analyte);
    items.push({
      id: `lab-${lab.id}`,
      at: lab.reported_at ?? lab.collected_at,
      kind: "lab",
      tone: lab.flag === "critical" ? "critical" : lab.flag === "abnormal" ? "elevated" : "neutral",
      title: lab.status === "pending" ? `${lab.type} collected — awaiting result` : `${lab.type} reported`,
      detail: abnormal.length ? `Out of range: ${abnormal.join(", ")}` : lab.status === "pending" ? undefined : "All results within range",
      href: `/patients/${input.patientId}/labs`,
    });
  }

  const seen = new Set<string>();
  for (const r of [...input.readings].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))) {
    const { severity } = classify(r.type, r.value);
    if (severity !== "critical") continue;
    const key = `${r.type}-${r.recordedAt.slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: `vital-${r.id}`,
      at: r.recordedAt,
      kind: "vital",
      tone: "critical",
      title: `Critical ${VITALS[r.type].label.toLowerCase()} reading`,
      detail: `${formatVital(r.type, r.value)} ${VITALS[r.type].unit}`,
      href: `/patients/${input.patientId}/vitals`,
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
