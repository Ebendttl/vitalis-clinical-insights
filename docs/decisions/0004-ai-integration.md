# 0004 — AI clinical summary

- **Status:** Accepted
- **Date:** 2026-11-24

## Decision

- **Provider and SDK:** Claude Haiku 5.5 (`claude-haiku-5-5`) through the official `@anthropic-ai/sdk`, called only from a Route Handler. The key never leaves the server.
- **Structured output:** `output_config.format: zodOutputFormat(AiSummary)`. The same Zod schema types the partial object on the client (`useObject`) and validates the complete object before the UI shows "Schema-verified". If validation fails, the content is withdrawn, never shown as final.
- **Latency (first token under 2 s):** `thinking: { type: "disabled" }` with `effort: "low"`. The task is summarising pre-computed statistics, which gains little from extended reasoning. The prompt is a compact numeric digest (~1–2k tokens), not raw rows.
- **Privacy:** the digest is de-identified (age, sex, conditions, per-vital statistics, abnormal lab analytes). No names, MRNs or contact details are sent. A unit test asserts this.
- **Graceful degradation:** the route holds the response until Claude's first token. A missing key, 429, 529 (overloaded), other API errors or a 6-second first-token timeout fall back to a deterministic **rule-based summary in the same schema**, labelled "Rule-based summary (AI unavailable)". After the first byte, the stream passes straight through, and a mid-stream failure becomes an error state with a retry button.
- **Refusals and truncation:** both arrive as HTTP 200, so the server checks `stop_reason` before recording success.
- **Abuse limits:** each clinician gets `AI_SUMMARY_HOURLY_LIMIT` summaries per hour, enforced from the audit log (HTTP 429 with `Retry-After`).
- **Labelling:** every state says "AI-generated, for demonstration only, not medical advice."
