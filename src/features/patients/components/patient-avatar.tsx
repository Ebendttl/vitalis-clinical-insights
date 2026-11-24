import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Initials avatar. Synthetic patients have no photos — by design, not omission. */
export function PatientAvatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-accent font-semibold text-accent-foreground",
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-16 text-xl",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
