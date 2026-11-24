import { cn } from "@/lib/utils";

/** Vitalis mark: a rounded tile with a pulse trace that resolves into a "V". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M5 17h4.5l2-4 3 10 4.5-15 2.5 9H27"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className, hideWordmark = false }: { className?: string; hideWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!hideWordmark && <span className="text-lg font-semibold tracking-tight">Vitalis</span>}
    </span>
  );
}
