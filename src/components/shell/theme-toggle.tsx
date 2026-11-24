"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * Icons swap purely via the `.dark` class next-themes sets before paint, so there
 * is no hydration mismatch and no "mounted" flicker.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
    >
      <SunIcon className="dark:hidden" aria-hidden />
      <MoonIcon className="hidden dark:block" aria-hidden />
    </Button>
  );
}
