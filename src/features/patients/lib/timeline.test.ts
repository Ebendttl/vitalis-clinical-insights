import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";

describe("buildTimeline", () => {
  const diagnoses = [
    {
      id: "00000000-0000-4000-8000-000000000001",
      code: "I10",
      name: "Hypertension",
      description: "",
      status: "active" as const,
      onset_date: "2025-01-01",
      resolved_date: null,
      updated_at: "2025-01-01T00:00:00Z",
      diagnosis_events: [
        { id: 1, event_type: "diagnosed" as const, from_status: null, to_status: "active" as const, note: "Recorded", occurred_at: "2025-01-01T09:00:00Z" },
      ],
    },
  ];
  const labs = [
    {
      id: "00000000-0000-4000-8000-000000000002",
      type: "Lipid panel",
      status: "final" as const,
      flag: "abnormal" as const,
      collected_at: "2026-10-01T09:00:00Z",
      reported_at: "2026-10-02T09:00:00Z",
      file_path: "x.pdf",
      results: [{ analyte: "LDL cholesterol", value: 4.1, unit: "mmol/L", low: 0, high: 3, flag: "abnormal" as const }],
    },
  ];
  const readings = [
    { id: 1, type: "heart_rate" as const, value: 140, recordedAt: "2026-11-20T08:00:00Z" },
    { id: 2, type: "heart_rate" as const, value: 145, recordedAt: "2026-11-20T18:00:00Z" },
    { id: 3, type: "heart_rate" as const, value: 72, recordedAt: "2026-11-21T08:00:00Z" },
  ];

  it("merges sources newest first and collapses same-day critical readings", () => {
    const items = buildTimeline({ diagnoses, labs, readings, patientId: "p" });
    expect(items.map((i) => i.kind)).toEqual(["vital", "lab", "diagnosis"]);
    expect(items[0]).toMatchObject({ title: "Critical heart rate reading", detail: "145 bpm", tone: "critical" });
    expect(items[1].detail).toBe("Out of range: LDL cholesterol");
    expect(items[2].title).toBe("Hypertension diagnosed");
  });

  it("respects the limit", () => {
    expect(buildTimeline({ diagnoses, labs, readings, patientId: "p" }, 1)).toHaveLength(1);
  });
});
