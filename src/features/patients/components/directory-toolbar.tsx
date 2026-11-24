"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { ToggleGroup } from "radix-ui";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RISK_LABELS } from "@/features/vitals/lib/risk";
import { cn } from "@/lib/utils";
import { useDirectoryFilters } from "../hooks/use-directory";
import { AGE_BANDS, type AgeBand, type DirectorySort, RISK_LEVELS, type RiskLevel } from "../schemas";

const ALL = "all";
const SORT_LABELS: Record<DirectorySort, string> = {
  risk: "Highest risk",
  name: "Name A–Z",
  age: "Oldest first",
  recent: "Latest reading",
};
const AGE_LABELS: Record<AgeBand, string> = { "18-39": "18–39", "40-64": "40–64", "65+": "65 and over" };
const RISK_DOT: Record<RiskLevel, string> = {
  low: "bg-normal",
  moderate: "bg-muted-foreground",
  elevated: "bg-elevated",
  critical: "bg-critical",
};

export function DirectoryToolbar({ conditions }: { conditions: string[] }) {
  const [filters, setFilters] = useDirectoryFilters();
  const searchRef = useRef<HTMLInputElement>(null);
  const hasFilters = Boolean(filters.q || filters.risk.length || filters.condition || filters.age);

  // "/" focuses search, a common convention in data-dense tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-col gap-3" role="search" aria-label="Filter patients">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          ref={searchRef}
          type="search"
          value={filters.q}
          onChange={(e) => void setFilters({ q: e.target.value })}
          placeholder="Search by name or MRN"
          aria-label="Search patients by name or MRN"
          aria-keyshortcuts="/"
          autoComplete="off"
          spellCheck={false}
          className="h-10 pr-10 pl-9"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border bg-muted px-1.5 text-xs text-muted-foreground sm:block">
          /
        </kbd>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup.Root
          type="multiple"
          value={filters.risk}
          onValueChange={(risk) => void setFilters({ risk: risk as RiskLevel[] })}
          aria-label="Risk level"
          className="flex flex-wrap gap-1.5"
        >
          {RISK_LEVELS.map((level) => (
            <ToggleGroup.Item
              key={level}
              value={level}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
            >
              <span className={cn("size-2 rounded-full", RISK_DOT[level])} aria-hidden />
              {RISK_LABELS[level]}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>

        <div className="ml-auto flex w-full flex-wrap gap-2 sm:w-auto">
          <Select value={filters.condition ?? ALL} onValueChange={(v) => void setFilters({ condition: v === ALL ? null : v })}>
            <SelectTrigger className="h-8 flex-1 sm:w-48 sm:flex-none" aria-label="Condition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All conditions</SelectItem>
              {conditions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.age ?? ALL} onValueChange={(v) => void setFilters({ age: v === ALL ? null : (v as AgeBand) })}>
            <SelectTrigger className="h-8 flex-1 sm:w-36 sm:flex-none" aria-label="Age">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All ages</SelectItem>
              {AGE_BANDS.map((band) => (
                <SelectItem key={band} value={band}>
                  {AGE_LABELS[band]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.sort} onValueChange={(v) => void setFilters({ sort: v as DirectorySort })}>
            <SelectTrigger className="h-8 flex-1 sm:w-40 sm:flex-none" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as DirectorySort[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {SORT_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void setFilters({ q: null, risk: null, condition: null, age: null })}
            >
              <XIcon /> Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
