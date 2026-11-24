import { KIND_META, VITAL_KINDS, VITALS, type VitalKind } from "@/features/vitals/lib/definitions";
import type { AiSummary } from "../schema";
import { type Digest, latestSeverity } from "./digest";

const FOLLOW_UP: Partial<Record<VitalKind, string>> = {
  blood_pressure: "Consider repeat blood pressure measurement and a medication review.",
  heart_rate: "Consider an ECG if the heart-rate change persists.",
  respiratory_rate: "Consider reassessing respiratory status at the next contact.",
  temperature: "Consider screening for infection if fever recurs.",
  spo2: "Consider a supervised pulse-oximetry recheck.",
};

/**
 * Deterministic fallback when the model is unavailable (no key, rate limit,
 * provider outage). Same schema as the AI summary, so the UI is identical and
 * the source is labelled honestly.
 */
export function ruleBasedSummary(digest: Digest): AiSummary {
  const trends: AiSummary["trends"] = [];
  const flags: AiSummary["flags"] = [];
  const followUps = new Set<string>();

  for (const kind of VITAL_KINDS) {
    const type = KIND_META[kind].types[0];
    const v = digest.vitals.find((d) => d.type === type);
    if (!v || v.mean7d === null || v.mean30d === null) continue;

    const { low, high } = VITALS[type].thresholds;
    const mid = (low + high) / 2;
    const delta = v.mean7d - v.mean30d;
    const towardNormal = Math.abs(v.mean7d - mid) < Math.abs(v.mean30d - mid);
    const direction: AiSummary["trends"][number]["direction"] =
      Math.abs(delta) < VITALS[type].trendEpsilon ? "stable" : towardNormal ? "improving" : "worsening";
    if (direction !== "stable") {
      trends.push({
        vital: kind,
        direction,
        detail: `7-day mean ${v.mean7d} ${v.unit} vs 30-day mean ${v.mean30d} ${v.unit}.`,
      });
    }

    const severity = latestSeverity(v);
    if (severity && severity.severity !== "normal") {
      flags.push({
        severity: severity.severity,
        finding: `Latest ${v.vital.toLowerCase()} ${v.latest} ${v.unit} is ${severity.direction === "low" ? "below" : "above"} the ${v.normalRange} range.`,
      });
      const tip = FOLLOW_UP[kind];
      if (tip) followUps.add(tip);
    } else if (v.critical30d > 0) {
      flags.push({ severity: "elevated", finding: `${v.critical30d} critical ${v.vital.toLowerCase()} reading(s) in the last 30 days.` });
    }
  }

  for (const lab of digest.abnormalLabs.slice(0, 1)) {
    followUps.add(`Review the ${lab.type} (${lab.analytes.join(", ")} out of range).`);
  }

  const status: AiSummary["status"] = flags.some((f) => f.severity === "critical")
    ? "concerning"
    : flags.length > 0 || trends.some((t) => t.direction === "worsening")
      ? "watch"
      : "stable";

  const headline =
    status === "stable"
      ? "Vitals have been stable and within range over the last 30 days."
      : status === "watch"
        ? `Mostly stable, with ${flags.length || "some"} finding${flags.length === 1 ? "" : "s"} worth monitoring.`
        : "Recent readings include critical values that warrant prompt review.";

  return {
    headline,
    status,
    trends: trends.slice(0, 5),
    flags: flags.slice(0, 4),
    followUps: [...followUps].slice(0, 3),
    confidence: "medium",
  };
}
