import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { PatientDirectory } from "@/features/patients/components/patient-directory";
import { DirectorySkeleton } from "@/features/patients/components/directory-skeleton";
import { directoryKey, fetchDirectory } from "@/features/patients/lib/directory-query";
import { loadDirectoryParams } from "@/features/patients/lib/search-params";
import { DirectoryFilters } from "@/features/patients/schemas";
import { getConditionOptions } from "@/features/patients/server/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Patients" };

/**
 * Prefetches the exact query the client will run (same key, same function) and
 * hands it over via HydrationBoundary, so the list paints with data on first load.
 */
async function DirectoryLoader({ searchParams }: { searchParams: PageProps<"/patients">["searchParams"] }) {
  const params = await loadDirectoryParams(searchParams);
  const filters = DirectoryFilters.parse(params);
  const queryClient = new QueryClient();
  const supabase = await createClient();
  const [conditions] = await Promise.all([
    getConditionOptions(),
    queryClient.prefetchQuery({ queryKey: directoryKey(filters), queryFn: () => fetchDirectory(supabase, filters) }),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PatientDirectory conditions={conditions} />
    </HydrationBoundary>
  );
}

export default function PatientsPage({ searchParams }: PageProps<"/patients">) {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader title="Patients" description="Your assigned panel, ranked by clinical risk." />
      <Suspense fallback={<DirectorySkeleton />}>
        <DirectoryLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
