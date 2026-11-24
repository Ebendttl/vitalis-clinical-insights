import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DiagnosesTable } from "@/features/diagnoses/components/diagnoses-table";
import { getDiagnoses } from "@/features/diagnoses/server/queries";

export const metadata: Metadata = { title: "Diagnoses" };

async function Diagnoses({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DiagnosesTable patientId={id} diagnoses={await getDiagnoses(id)} />;
}

export default function DiagnosesPage({ params }: PageProps<"/patients/[id]/diagnoses">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
      <Diagnoses params={params} />
    </Suspense>
  );
}
