import { AlertTriangleIcon, CircleDotIcon, ShieldCheckIcon, TrendingUpIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { RISK_LABELS } from "@/features/vitals/lib/risk";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "../schemas";

const TONE: Record<RiskLevel, BadgeTone> = { low: "normal", moderate: "neutral", elevated: "elevated", critical: "critical" };
const ICON = { low: ShieldCheckIcon, moderate: CircleDotIcon, elevated: TrendingUpIcon, critical: AlertTriangleIcon };

/** Risk is conveyed by icon + label + score, never colour alone. */
export function RiskBadge({ level, score, className }: { level: RiskLevel; score?: number; className?: string }) {
  const Icon = ICON[level];
  return (
    <Badge tone={TONE[level]} className={cn("num", className)}>
      <Icon aria-hidden />
      {RISK_LABELS[level]}
      {score !== undefined && <span className="opacity-80">· {score}</span>}
    </Badge>
  );
}
