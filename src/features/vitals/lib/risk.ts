/**
 * Vitalis Risk Index (VRI) — a demonstration score loosely modelled on NEWS2.
 *
 * Physiology scores follow NEWS2 bands for RR, SpO₂, systolic BP, HR and temperature.
 * VRI adds context NEWS2 deliberately omits (age, chronic burden, sustained hypertension)
 * because Vitalis is a longitudinal tool, not a bedside deterioration alert.
 * NOT VALIDATED. For demonstration only.
 */

import type { VitalType } from "./definitions";

export type RiskLevel = "low" | "moderate" | "elevated" | "critical";

export type RiskInput = {
  latest: Partial<Record<VitalType, number>>;
  ageYears: number;
  activeChronicConditions: number;
  /** Mean systolic over the last 30 days, if known. */
  meanSystolic30d?: number;
};

export type RiskFactor = { label: string; points: number };
export type RiskResult = { score: number; level: RiskLevel; factors: RiskFactor[] };

type Band = [max: number, points: number];

/** Returns the points of the first band whose upper bound contains the value. */
function scoreBands(value: number, bands: Band[]): number {
  for (const [max, points] of bands) if (value <= max) return points;
  return bands.at(-1)?.[1] ?? 0;
}

const BANDS: Partial<Record<VitalType, { label: string; bands: Band[] }>> = {
  respiratory_rate: { label: "Respiratory rate", bands: [[8, 3], [11, 1], [20, 0], [24, 2], [Infinity, 3]] },
  spo2: { label: "SpO₂", bands: [[91, 3], [93, 2], [95, 1], [Infinity, 0]] },
  bp_systolic: { label: "Systolic BP", bands: [[90, 3], [100, 2], [110, 1], [219, 0], [Infinity, 3]] },
  heart_rate: { label: "Heart rate", bands: [[40, 3], [50, 1], [90, 0], [110, 1], [130, 2], [Infinity, 3]] },
  temperature: { label: "Temperature", bands: [[35, 3], [36, 1], [38, 0], [39, 1], [Infinity, 2]] },
};

export function riskLevel(score: number): RiskLevel {
  if (score >= 8) return "critical";
  if (score >= 6) return "elevated";
  if (score >= 4) return "moderate";
  return "low";
}

export function computeRisk(input: RiskInput): RiskResult {
  const factors: RiskFactor[] = [];

  for (const [type, spec] of Object.entries(BANDS) as Array<[VitalType, { label: string; bands: Band[] }]>) {
    const value = input.latest[type];
    if (value === undefined) continue;
    const points = scoreBands(value, spec.bands);
    if (points > 0) factors.push({ label: spec.label, points });
  }

  if (input.ageYears >= 80) factors.push({ label: "Age 80+", points: 2 });
  else if (input.ageYears >= 65) factors.push({ label: "Age 65+", points: 1 });

  if (input.activeChronicConditions >= 3) factors.push({ label: "Multiple chronic conditions", points: 2 });
  else if (input.activeChronicConditions >= 1) factors.push({ label: "Chronic condition", points: 1 });

  if (input.meanSystolic30d !== undefined && input.meanSystolic30d >= 140) {
    factors.push({ label: "Sustained hypertension", points: 2 });
  }

  const score = Math.min(20, factors.reduce((sum, f) => sum + f.points, 0));
  return { score, level: riskLevel(score), factors: factors.sort((a, b) => b.points - a.points) };
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  elevated: "Elevated",
  critical: "High",
};

export function ageFromDob(dob: string, now: Date = new Date()): number {
  const birth = new Date(`${dob}T00:00:00Z`);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}
