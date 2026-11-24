"use client";

import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string };

/**
 * Single-select toggle group (e.g. time ranges). Radix gives us roving tab-index
 * and arrow-key navigation; we forbid deselecting so a value is always active.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<Option<T>>;
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onValueChange(next as T)}
      aria-label={label}
      className={cn("inline-flex rounded-lg bg-muted p-0.5", className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className="h-7 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
