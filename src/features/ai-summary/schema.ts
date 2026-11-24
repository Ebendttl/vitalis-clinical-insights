import { z } from "zod";
import { VITAL_KINDS } from "@/features/vitals/lib/definitions";

/**
 * The contract between the model and the UI. Sent to Claude as the structured
 * output format, used by useObject to type partial results, and re-validated in
 * full before the summary is marked complete.
 * Array lengths are bounded in the prompt: JSON-schema min/max items are not
 * enforced by structured outputs for every type, so the prompt is the source of truth.
 */
export const AiSummary = z.object({
  headline: z.string().describe("One plain-language sentence summarising the patient's recent course."),
  status: z.enum(["stable", "watch", "concerning"]).describe("Overall direction over the last 30 days."),
  trends: z
    .array(
      z.object({
        vital: z.enum(VITAL_KINDS),
        direction: z.enum(["improving", "worsening", "stable"]),
        detail: z.string().describe("Short, specific, with numbers and units."),
      }),
    )
    .describe("Up to 5 notable vital trends."),
  flags: z
    .array(
      z.object({
        severity: z.enum(["elevated", "critical"]),
        finding: z.string(),
      }),
    )
    .describe("Up to 4 out-of-range findings worth a clinician's attention."),
  followUps: z.array(z.string()).describe("Up to 3 suggested follow-up checks, phrased as considerations."),
  confidence: z.enum(["low", "medium", "high"]).describe("Confidence given data volume and consistency."),
});
export type AiSummary = z.infer<typeof AiSummary>;

export const SUMMARY_SOURCE_HEADER = "x-summary-source";
export type SummarySource = "model" | "rule-based";
