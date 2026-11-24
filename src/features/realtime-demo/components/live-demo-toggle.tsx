"use client";

import { RadioIcon, SquareIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLiveVitals } from "../hooks/use-live-vitals";
import { simulateReading } from "../server/actions";

const INTERVAL_MS = 2_500;
const MAX_DURATION_MS = 120_000;

/** Streams simulated check-ins every 2.5 s for up to two minutes. */
export function LiveDemoToggle({ patientId }: { patientId: string }) {
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const startedAt = useRef(0);
  const { status, lastLatencyMs } = useLiveVitals(patientId, on);

  useEffect(() => {
    if (!on || status !== "live") return;
    startedAt.current = Date.now();
    const tick = () =>
      startTransition(async () => {
        const result = await simulateReading({ patientId });
        if (!result.ok) {
          setError(result.error);
          setOn(false);
        }
      });
    tick();
    const id = setInterval(() => {
      if (Date.now() - startedAt.current > MAX_DURATION_MS) setOn(false);
      else tick();
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [on, status, patientId]);

  return (
    <div className="flex items-center gap-2">
      {on && (
        <span className="num text-xs text-muted-foreground" aria-live="polite">
          {status === "live" ? (lastLatencyMs !== null ? `Live · ${lastLatencyMs} ms` : "Live") : status === "error" ? "Connection lost" : "Connecting…"}
        </span>
      )}
      {error && !on && (
        <span role="alert" className="text-xs text-critical">
          {error}
        </span>
      )}
      <Button
        variant={on ? "outline" : "secondary"}
        size="sm"
        aria-pressed={on}
        onClick={() => {
          setError(null);
          setOn((v) => !v);
        }}
      >
        {on ? <SquareIcon /> : <RadioIcon className={cn(status === "live" && "text-primary")} />}
        {on ? "Stop live demo" : "Live demo"}
      </Button>
    </div>
  );
}
