import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LabResults } from "@/features/labs/components/lab-results";
import { getLabReports } from "@/features/labs/server/queries";

export const metadata: Metadata = { title: "Lab results" };

async function Labs({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LabResults reports={await getLabReports(id)} />;
}

export default function LabsPage({ params }: PageProps<"/patients/[id]/labs">) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-lg" />
          ))}
        </div>
      }
    >
      <Labs params={params} />
    </Suspense>
  );
}
