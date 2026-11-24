import { Faker, en } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { classify } from "../../src/features/vitals/lib/definitions";
import { generatePatient } from "./generate";

const now = new Date("2026-11-24T12:00:00Z");
const make = (seed: number, forceAcute = false) => {
  const f = new Faker({ locale: [en] });
  f.seed(seed);
  return generatePatient(f, 0, { now, days: 730, forceAcute });
};

describe("generatePatient", () => {
  it("is deterministic for a given seed", () => {
    expect(make(7).patient).toEqual(make(7).patient);
    expect(make(7).readings.length).toBe(make(7).readings.length);
  });

  it("produces ~24 months of readings ending just before now", () => {
    const { readings } = make(11);
    const times = readings.map((r) => Date.parse(r.recorded_at));
    expect(Math.min(...times)).toBeLessThan(now.getTime() - 700 * 86_400_000);
    expect(Math.max(...times)).toBeLessThan(now.getTime());
    expect(Math.max(...times)).toBeGreaterThan(now.getTime() - 86_400_000);
    // Six vitals per check-in.
    expect(readings.length % 6).toBe(0);
  });

  it("includes occasional abnormal readings but is mostly in range", () => {
    const { readings } = make(3);
    const abnormal = readings.filter((r) => classify(r.type, r.value).severity !== "normal").length;
    expect(abnormal).toBeGreaterThan(0);
    expect(abnormal / readings.length).toBeLessThan(0.5);
  });

  it("keeps diagnoses consistent with the schema's check constraints", () => {
    for (let seed = 1; seed < 30; seed++) {
      for (const dx of make(seed).diagnoses) {
        expect(dx.status === "resolved").toBe(dx.resolved_date !== null);
        if (dx.resolved_date) expect(dx.resolved_date >= dx.onset_date).toBe(true);
        if (dx.resolved_date) expect(dx.resolved_date <= "2026-11-24").toBe(true);
      }
    }
  });

  it("only attaches PDFs to reported labs and stores them under the patient folder", () => {
    const { labs, patient } = make(5);
    expect(labs.length).toBeGreaterThan(4);
    for (const lab of labs) {
      if (lab.status === "pending") expect(lab.file_path).toBeNull();
      else expect(lab.file_path).toBe(`${patient.id}/${lab.id}.pdf`);
    }
  });

  it("forced acute patients have a recent abnormal reading", () => {
    const { readings } = make(21, true);
    const lastDay = readings.filter((r) => Date.parse(r.recorded_at) > now.getTime() - 3 * 86_400_000);
    expect(lastDay.some((r) => classify(r.type, r.value).severity !== "normal")).toBe(true);
  });
});
