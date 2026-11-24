"use client";

import { InfoIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RISK_LABELS, type RiskResult } from "../lib/risk";

const LEVEL_COLOR = {
  low: "var(--status-normal)",
  moderate: "var(--muted-foreground)",
  elevated: "var(--status-elevated)",
  critical: "var(--status-critical)",
} as const;

const R = 26;
const CIRC = 2 * Math.PI * R;

/** Risk index as a progress ring (score / 20) with its contributing factors on demand. */
export function RiskRing({ risk, className }: { risk: RiskResult; className?: string }) {
  const fraction = Math.min(1, risk.score / 20);
  const color = LEVEL_COLOR[risk.level];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={R} fill="none" stroke="var(--muted)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${CIRC * fraction} ${CIRC}`}
          className="transition-[stroke-dasharray] duration-500 ease-(--ease-out-soft)"
        />
        <text
          x="32"
          y="32"
          transform="rotate(90 32 32)"
          textAnchor="middle"
          dominantBaseline="central"
          className="num fill-foreground text-lg font-semibold"
        >
          {risk.score}
        </text>
      </svg>
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">Vitalis Risk Index</p>
        <p className="font-semibold" style={{ color }}>
          {RISK_LABELS[risk.level]} risk
        </p>
        <Tooltip
          side="bottom"
          content={
            <div className="space-y-1 py-1">
              <p className="font-medium">Contributing factors</p>
              {risk.factors.length === 0 ? (
                <p>No risk factors present.</p>
              ) : (
                <ul className="space-y-0.5">
                  {risk.factors.map((f) => (
                    <li key={f.label} className="num flex justify-between gap-4">
                      <span>{f.label}</span>
                      <span>+{f.points}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="pt-1 opacity-80">Demonstration score inspired by NEWS2. Not validated.</p>
            </div>
          }
        >
          <button type="button" className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground">
            <InfoIcon className="size-3" aria-hidden /> Why this score?
          </button>
        </Tooltip>
      </div>
      <span className="sr-only">
        Risk score {risk.score} of 20, {RISK_LABELS[risk.level]}. Factors: {risk.factors.map((f) => `${f.label} plus ${f.points}`).join(", ") || "none"}.
      </span>
    </div>
  );
}
