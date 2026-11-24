/**
 * Clinical reference ranges for adult vitals.
 *
 * Ranges are simplified from common adult guidance (AHA BP categories, NEWS2 bands)
 * for demonstration purposes only — this is not a validated clinical tool.
 */

export const VITAL_TYPES = [
  "bp_systolic",
  "bp_diastolic",
  "heart_rate",
  "respiratory_rate",
  "temperature",
  "spo2",
] as const;

export type VitalType = (typeof VITAL_TYPES)[number];

/** The five vitals shown to clinicians; BP combines systolic + diastolic. */
export const VITAL_KINDS = ["blood_pressure", "heart_rate", "respiratory_rate", "temperature", "spo2"] as const;
export type VitalKind = (typeof VITAL_KINDS)[number];

export type Severity = "normal" | "elevated" | "critical";
export type Direction = "low" | "high";

export type Thresholds = {
  /** Strictly below this is critical. */
  criticalLow: number;
  /** Normal range, inclusive. */
  low: number;
  high: number;
  /** Strictly above this is critical. */
  criticalHigh: number;
};

export type VitalDefinition = {
  type: VitalType;
  label: string;
  unit: string;
  decimals: number;
  thresholds: Thresholds;
  /** Y-axis domain that keeps charts comparable between patients. */
  domain: [number, number];
  /** Changes smaller than this are reported as "stable". */
  trendEpsilon: number;
};

export const VITALS: Record<VitalType, VitalDefinition> = {
  bp_systolic: {
    type: "bp_systolic",
    label: "Systolic",
    unit: "mmHg",
    decimals: 0,
    thresholds: { criticalLow: 80, low: 90, high: 129, criticalHigh: 179 },
    domain: [70, 200],
    trendEpsilon: 3,
  },
  bp_diastolic: {
    type: "bp_diastolic",
    label: "Diastolic",
    unit: "mmHg",
    decimals: 0,
    thresholds: { criticalLow: 50, low: 60, high: 84, criticalHigh: 119 },
    domain: [70, 200],
    trendEpsilon: 2,
  },
  heart_rate: {
    type: "heart_rate",
    label: "Heart rate",
    unit: "bpm",
    decimals: 0,
    thresholds: { criticalLow: 40, low: 50, high: 100, criticalHigh: 130 },
    domain: [35, 160],
    trendEpsilon: 3,
  },
  respiratory_rate: {
    type: "respiratory_rate",
    label: "Respiratory rate",
    unit: "br/min",
    decimals: 0,
    thresholds: { criticalLow: 8, low: 12, high: 20, criticalHigh: 24 },
    domain: [6, 32],
    trendEpsilon: 1,
  },
  temperature: {
    type: "temperature",
    label: "Temperature",
    unit: "°C",
    decimals: 1,
    thresholds: { criticalLow: 35, low: 36.1, high: 37.5, criticalHigh: 38.9 },
    domain: [34.5, 40.5],
    trendEpsilon: 0.2,
  },
  spo2: {
    type: "spo2",
    label: "SpO₂",
    unit: "%",
    decimals: 0,
    thresholds: { criticalLow: 92, low: 95, high: 100, criticalHigh: 100 },
    domain: [84, 100],
    trendEpsilon: 1,
  },
};

export const KIND_META: Record<VitalKind, { label: string; unit: string; types: VitalType[] }> = {
  blood_pressure: { label: "Blood pressure", unit: "mmHg", types: ["bp_systolic", "bp_diastolic"] },
  heart_rate: { label: "Heart rate", unit: "bpm", types: ["heart_rate"] },
  respiratory_rate: { label: "Respiratory rate", unit: "br/min", types: ["respiratory_rate"] },
  temperature: { label: "Temperature", unit: "°C", types: ["temperature"] },
  spo2: { label: "Oxygen saturation", unit: "%", types: ["spo2"] },
};

export type Classification = { severity: Severity; direction: Direction | null };

export function classify(type: VitalType, value: number): Classification {
  const t = VITALS[type].thresholds;
  if (value < t.criticalLow) return { severity: "critical", direction: "low" };
  if (value > t.criticalHigh) return { severity: "critical", direction: "high" };
  if (value < t.low) return { severity: "elevated", direction: "low" };
  if (value > t.high) return { severity: "elevated", direction: "high" };
  return { severity: "normal", direction: null };
}

const SEVERITY_RANK: Record<Severity, number> = { normal: 0, elevated: 1, critical: 2 };

export function worstSeverity(severities: Severity[]): Severity {
  return severities.reduce<Severity>((worst, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[worst] ? s : worst), "normal");
}

export function severityLabel({ severity, direction }: Classification): string {
  if (severity === "normal") return "In range";
  const side = direction === "low" ? "low" : "high";
  return severity === "critical" ? `Critically ${side}` : side === "low" ? "Below range" : "Above range";
}

export function formatVital(type: VitalType, value: number): string {
  return value.toFixed(VITALS[type].decimals);
}
