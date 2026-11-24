import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors PatientHero's exact dimensions so streaming in causes no layout shift. */
export function HeroSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading patient">
      <div className="card-surface overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="hidden size-16 rounded-full sm:block" />
        </div>
        <div className="flex gap-1 overflow-hidden border-t p-1.5 md:grid md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="min-w-[11.5rem] space-y-2 p-3.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-10 w-80" />
    </div>
  );
}
