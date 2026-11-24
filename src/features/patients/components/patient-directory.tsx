"use client";

import { SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { useDirectory, useDirectoryFilters } from "../hooks/use-directory";
import { DirectoryToolbar } from "./directory-toolbar";
import { PatientList } from "./patient-list";

export function PatientDirectory({ conditions }: { conditions: string[] }) {
  const [filters, setFilters] = useDirectoryFilters();
  const { data, isError, refetch, isFetching, isPlaceholderData } = useDirectory(filters);

  return (
    <div className="space-y-4">
      <DirectoryToolbar conditions={conditions} />

      <div className="flex h-5 items-center justify-between text-sm text-muted-foreground">
        {/* Polite live region: screen readers hear the new count after each search settles. */}
        <p aria-live="polite" aria-atomic className="num">
          {data ? `${data.total} ${data.total === 1 ? "patient" : "patients"}` : ""}
        </p>
        {data && (
          <p className="num text-xs" title="Server query time for the last search">
            {isFetching ? "Searching…" : `${data.durationMs} ms`}
          </p>
        )}
      </div>

      <div className={isPlaceholderData ? "opacity-70 transition-opacity" : "transition-opacity"}>
        {isError ? (
          <ErrorState className="card-surface" description="The patient list couldn't be loaded." onRetry={() => void refetch()} />
        ) : data && data.patients.length === 0 ? (
          <EmptyState
            className="card-surface"
            icon={SearchXIcon}
            title="No patients match these filters"
            description="Try a different name or MRN, or clear filters to see your full panel."
            action={
              <Button variant="outline" size="sm" onClick={() => void setFilters({ q: null, risk: null, condition: null, age: null })}>
                Clear filters
              </Button>
            }
          />
        ) : data ? (
          <PatientList patients={data.patients} />
        ) : null}
      </div>
    </div>
  );
}
