import { classify, KIND_META, VITAL_KINDS, VITALS, type VitalType } from "@/features/vitals/lib/definitions";
import { type ReadingLike, seriesFor, summarize } from "@/features/vitals/lib/series";

const DAY = 86_400_000;

export type DigestInput = {
  ageYears: number;
  sex: "female" | "male";
  conditions: string[];
  readings: readonly ReadingLike[];
  abnormalLabs: Array<{ type: string; analytes: string[]; reportedAt: string }>;
  now?: number;
};

export type VitalDigest = {
  vital: string;
  type: VitalType;
  unit: string;
  latest: number | null;
  mean7d: number | null;
  mean30d: number | null;
  min90d: number | null;
  max90d: number | null;
  outOfRange30d: number;
  critical30d: number;
  normalRange: string;
};

const round = (v: number | null, d: number) => (v === null ? null : Number(v.toFixed(d)));

/**
 * Compact, de-identified numeric digest sent to the model instead of raw rows:
 * no names, MRNs or contact details ever leave the server, and the prompt stays
 * small (~1–2k tokens), which keeps time-to-first-token low.
 */
export function buildDigest(input: DigestInput) {
  const now = input.now ?? Date.now();
  const vitals: VitalDigest[] = VITAL_KINDS.flatMap((kind) =>
    KIND_META[kind].types.map((type) => {
      const all = seriesFor(input.readings, type);
      const last = (days: number) => all.filter((p) => p.t > now - days * DAY);
      const s7 = summarize(last(7), type);
      const s30 = summarize(last(30), type);
      const s90 = summarize(last(90), type);
      const def = VITALS[type];
      return {
        vital: def.label,
        type,
        unit: def.unit,
        latest: round(s90.latest?.value ?? null, def.decimals),
        mean7d: round(s7.mean, def.decimals + 1),
        mean30d: round(s30.mean, def.decimals + 1),
        min90d: s90.min,
        max90d: s90.max,
        outOfRange30d: s30.outOfRange,
        critical30d: s30.critical,
        normalRange: `${def.thresholds.low}–${def.thresholds.high} ${def.unit}`,
      };
    }),
  );
  return {
    patient: { ageYears: input.ageYears, sex: input.sex, activeConditions: input.conditions },
    vitals,
    abnormalLabs: input.abnormalLabs.slice(0, 5),
  };
}

export type Digest = ReturnType<typeof buildDigest>;

/** Latest value classification, used by the rule-based fallback. */
export function latestSeverity(v: VitalDigest) {
  return v.latest === null ? null : classify(v.type, v.latest);
}
