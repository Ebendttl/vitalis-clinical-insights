"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import {
  AlertTriangleIcon,
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BadgeCheckIcon,
  RotateCcwIcon,
  SparklesIcon,
  SquareIcon,
} from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OPEN_SUMMARY_EVENT } from "@/features/command-palette/components/command-palette";
import { KIND_META } from "@/features/vitals/lib/definitions";
import { cn } from "@/lib/utils";
import { AiSummary, SUMMARY_SOURCE_HEADER, type SummarySource } from "../schema";

const STATUS = {
  stable: { label: "Stable", tone: "normal" },
  watch: { label: "Watch", tone: "elevated" },
  concerning: { label: "Concerning", tone: "critical" },
} as const;

const TREND_ICON = { improving: ArrowDownRightIcon, worsening: ArrowUpRightIcon, stable: ArrowRightIcon };

type Phase = "idle" | "streaming" | "done" | "invalid" | "error";

/**
 * Streams a structured summary. Partial fields render as they arrive (each is
 * type-checked by useObject against the deep-partial schema); the complete object
 * is validated with AiSummary before the result is marked verified. If it fails,
 * the content is withdrawn and replaced by an error, never shown as final.
 */
export function AiSummaryCard({ patientId }: { patientId: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [source, setSource] = useState<SummarySource>("model");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ttftMs, setTtftMs] = useState<number | null>(null);
  const startedAt = useRef(0);
  const cardRef = useRef<HTMLElement>(null);

  const { object, submit, stop, isLoading } = useObject({
    api: `/api/patients/${patientId}/summary`,
    schema: AiSummary,
    fetch: async (input, init) => {
      const res = await fetch(input, init);
      setSource((res.headers.get(SUMMARY_SOURCE_HEADER) as SummarySource | null) ?? "model");
      if (res.status === 429) {
        const body = (await res.clone().json().catch(() => null)) as { error?: string } | null;
        setErrorMessage(body?.error ?? "Rate limit reached. Try again later.");
      }
      if (!res.ok || !res.body) return res;
      // Time-to-first-token measured on the wire, at the first body chunk.
      let seenFirst = false;
      const timed = res.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            if (!seenFirst) {
              seenFirst = true;
              setTtftMs(Math.round(performance.now() - startedAt.current));
            }
            controller.enqueue(chunk);
          },
        }),
      );
      return new Response(timed, { status: res.status, headers: res.headers });
    },
    onFinish: ({ error }) => setPhase(error ? "invalid" : "done"),
    onError: () => setPhase("error"),
  });

  const generate = () => {
    setErrorMessage(null);
    setTtftMs(null);
    setPhase("streaming");
    startedAt.current = performance.now();
    submit({});
  };

  // Command palette "Generate AI summary" action; useEffectEvent always sees the latest state.
  const onPaletteRequest = useEffectEvent(() => {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (!isLoading) generate();
  });
  useEffect(() => {
    const handler = () => onPaletteRequest();
    window.addEventListener(OPEN_SUMMARY_EVENT, handler);
    return () => window.removeEventListener(OPEN_SUMMARY_EVENT, handler);
  }, []);

  const showContent = object && (phase === "streaming" || phase === "done");
  const status = object?.status ? STATUS[object.status] : null;

  return (
    <Card ref={cardRef} aria-labelledby="ai-summary-heading" aria-busy={isLoading}>
      <CardHeader className="flex-wrap">
        <div className="space-y-1">
          <CardTitle id="ai-summary-heading" className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" aria-hidden />
            Clinical summary
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {source === "rule-based" && phase !== "idle"
              ? "Rule-based summary (AI unavailable). For demonstration only, not medical advice."
              : "AI-generated, for demonstration only, not medical advice."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {phase === "done" && (
            <Badge tone="accent" title="Full response validated against the summary schema">
              <BadgeCheckIcon aria-hidden /> Schema-verified
            </Badge>
          )}
          {isLoading ? (
            <Button variant="outline" size="sm" onClick={() => stop()}>
              <SquareIcon /> Stop
            </Button>
          ) : (
            <Button variant={phase === "idle" ? "primary" : "outline"} size="sm" onClick={generate}>
              {phase === "idle" ? <SparklesIcon /> : <RotateCcwIcon />}
              {phase === "idle" ? "Generate summary" : "Regenerate"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent aria-live="polite">
        {phase === "idle" && (
          <p className="text-sm text-muted-foreground">
            Summarise this patient&rsquo;s last 90 days of vitals and recent labs. Only de-identified statistics are sent to the model.
          </p>
        )}

        {(phase === "error" || phase === "invalid") && (
          <div role="alert" className="flex items-start gap-3 rounded-lg bg-critical-subtle p-3 text-sm text-critical">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              {errorMessage ??
                (phase === "invalid"
                  ? "The summary didn't pass validation, so it wasn't shown. Try regenerating."
                  : "The summary couldn't be generated. Check your connection and try again.")}
            </p>
          </div>
        )}

        {phase === "streaming" && !object && (
          <div className="space-y-2" role="status" aria-label="Generating summary">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {showContent && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start gap-2">
              {status && <Badge tone={status.tone}>{status.label}</Badge>}
              {object.headline && <p className="flex-1 text-base font-medium">{object.headline}</p>}
            </div>

            {object.flags && object.flags.length > 0 && (
              <section aria-label="Flags" className="space-y-1.5">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Flags</h3>
                <ul className="space-y-1">
                  {object.flags.map((f, i) =>
                    f?.finding ? (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span
                          className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", f.severity === "critical" ? "bg-critical" : "bg-elevated")}
                          aria-hidden
                        />
                        <span>
                          <span className="sr-only">{f.severity}: </span>
                          {f.finding}
                        </span>
                      </li>
                    ) : null,
                  )}
                </ul>
              </section>
            )}

            {object.trends && object.trends.length > 0 && (
              <section aria-label="Trends" className="space-y-1.5">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Trends</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {object.trends.map((t, i) => {
                    if (!t?.vital || !t.detail) return null;
                    const Icon = TREND_ICON[t.direction ?? "stable"];
                    return (
                      <li key={i} className="rounded-md bg-muted/60 p-2.5 text-sm">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                          {KIND_META[t.vital].label}
                          <span className="font-normal text-muted-foreground">· {t.direction}</span>
                        </span>
                        <span className="num mt-0.5 block text-muted-foreground">{t.detail}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {object.followUps && object.followUps.length > 0 && (
              <section aria-label="Suggested follow-ups" className="space-y-1.5">
                <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Consider</h3>
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {object.followUps.map((f, i) => (f ? <li key={i}>{f}</li> : null))}
                </ul>
              </section>
            )}

            <p className="num text-xs text-muted-foreground">
              {object.confidence && `Confidence: ${object.confidence}`}
              {ttftMs !== null && source === "model" && ` · first token ${ttftMs} ms`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
