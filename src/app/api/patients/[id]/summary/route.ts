import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { type NextRequest, NextResponse } from "next/server";
import { buildDigest, type Digest } from "@/features/ai-summary/lib/digest";
import { ruleBasedSummary } from "@/features/ai-summary/lib/rule-based";
import { AiSummary, SUMMARY_SOURCE_HEADER, type SummarySource } from "@/features/ai-summary/schema";
import { SYSTEM_PROMPT } from "@/features/ai-summary/server/prompt";
import { writeAudit } from "@/features/audit/server/log";
import { getLabReports } from "@/features/labs/server/queries";
import { getPatient } from "@/features/patients/server/queries";
import { ageFromDob } from "@/features/vitals/lib/risk";
import { getRecentReadings } from "@/features/vitals/server/queries";
import { env } from "@/lib/env";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";

export const maxDuration = 30;

const FIRST_TOKEN_TIMEOUT_MS = 6_000;
const FALLBACK_REASON_HEADER = "x-summary-fallback-reason";

function textStream(text: string) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

function respond(body: ReadableStream<Uint8Array>, source: SummarySource, extra: Record<string, string> = {}) {
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      [SUMMARY_SOURCE_HEADER]: source,
      ...extra,
    },
  });
}

/** Maps SDK errors to a short, non-sensitive reason. Most specific class first. */
function failureReason(error: unknown): string {
  if (error instanceof Anthropic.RateLimitError) return "rate_limited";
  if (error instanceof Anthropic.AuthenticationError) return "auth";
  if (error instanceof Anthropic.APIError) return error.status === 529 ? "overloaded" : `api_${error.status ?? "error"}`;
  if (error instanceof Error && error.message === "first_token_timeout") return "timeout";
  return "unavailable";
}

function fallback(supabase: ServerSupabase, patientId: string, digest: Digest, reason: string) {
  void writeAudit(
    { action: "ai_summary.generated", entityType: "patient", entityId: patientId, patientId, metadata: { source: "rule-based", reason } },
    supabase,
  );
  return respond(textStream(JSON.stringify(ruleBasedSummary(digest))), "rule-based", { [FALLBACK_REASON_HEADER]: reason });
}

/**
 * Streams a structured, Zod-validated clinical summary.
 *
 * The response is held until Claude's first token so that any provider failure
 * (missing key, 429, overload, timeout) can still fall back to a rule-based
 * summary with the same schema. After the first byte we stream straight through.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/patients/[id]/summary">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // RLS: an unassigned patient resolves to notFound() here.
  const [patient, readings, labs] = await Promise.all([getPatient(id), getRecentReadings(id), getLabReports(id)]);

  const { data: used } = await supabase.rpc("recent_action_count", { p_action: "ai_summary.generated", p_window: "1 hour" });
  if ((used ?? 0) >= env.AI_SUMMARY_HOURLY_LIMIT) {
    return NextResponse.json(
      { error: `You've reached the limit of ${env.AI_SUMMARY_HOURLY_LIMIT} summaries per hour. Try again later.` },
      { status: 429, headers: { "retry-after": "900" } },
    );
  }

  const digest = buildDigest({
    ageYears: ageFromDob(patient.date_of_birth),
    sex: patient.sex,
    conditions: patient.conditions,
    readings,
    abnormalLabs: labs
      .filter((l) => l.flag !== "normal" && l.reported_at)
      .map((l) => ({
        type: l.type,
        analytes: l.results.filter((r) => r.flag !== "normal").map((r) => r.analyte),
        reportedAt: l.reported_at as string,
      })),
  });

  if (!env.ANTHROPIC_API_KEY) return fallback(supabase, id, digest, "not_configured");

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 25_000 });
  const stream = client.messages.stream(
    {
      model: env.AI_SUMMARY_MODEL,
      max_tokens: 4000,
      // Latency over depth: a short structured summary of pre-computed statistics
      // doesn't benefit from extended reasoning, and thinking delays the first token.
      thinking: { type: "disabled" },
      output_config: { effort: "low", format: zodOutputFormat(AiSummary) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Patient digest:\n${JSON.stringify(digest)}` }],
    },
    { signal: request.signal },
  );

  const encoder = new TextEncoder();
  let resolveFirst: () => void = () => {};
  let rejectFirst: (e: unknown) => void = () => {};
  const firstToken = new Promise<void>((res, rej) => {
    resolveFirst = res;
    rejectFirst = rej;
  });

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("text", (delta) => {
        resolveFirst();
        controller.enqueue(encoder.encode(delta));
      });
      stream
        .finalMessage()
        .then((message) => {
          resolveFirst();
          // Refusals and truncation arrive as HTTP 200; check before trusting the content.
          const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
          let json: unknown = null;
          try {
            json = JSON.parse(text);
          } catch {
            // Leave null: recorded as a failed summary below; the client's schema check rejects it too.
          }
          const parsed = message.stop_reason === "end_turn" ? AiSummary.safeParse(json) : null;
          void writeAudit({
            action: parsed?.success ? "ai_summary.generated" : "ai_summary.failed",
            entityType: "patient",
            entityId: id,
            patientId: id,
            metadata: { source: "model", model: message.model, stop_reason: message.stop_reason, output_tokens: message.usage.output_tokens },
          }, supabase);
          controller.close();
        })
        .catch((error: unknown) => {
          rejectFirst(error);
          try {
            controller.error(error);
          } catch {
            // Stream already cancelled by the client.
          }
        });
    },
    cancel() {
      stream.abort();
    },
  });

  try {
    await Promise.race([
      firstToken,
      new Promise((_, rej) => setTimeout(() => rej(new Error("first_token_timeout")), FIRST_TOKEN_TIMEOUT_MS)),
    ]);
  } catch (error) {
    stream.abort();
    void body.cancel().catch(() => {});
    return fallback(supabase, id, digest, failureReason(error));
  }

  return respond(body, "model");
}
