import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AiSummaryCard } from "@/features/ai-summary/components/ai-summary-card";
import { getDiagnoses } from "@/features/diagnoses/server/queries";
import { getLabReports } from "@/features/labs/server/queries";
import { ActivityTimeline } from "@/features/patients/components/activity-timeline";
import { ContactCard } from "@/features/patients/components/contact-card";
import { buildTimeline } from "@/features/patients/lib/timeline";
import { getPatient } from "@/features/patients/server/queries";
import { getRecentReadings } from "@/features/vitals/server/queries";

export async function generateMetadata({ params }: PageProps<"/patients/[id]">): Promise<Metadata> {
  const { id } = await params;
  const patient = await getPatient(id);
  return { title: patient.full_name };
}

async function Timeline({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [diagnoses, labs, readings] = await Promise.all([getDiagnoses(id), getLabReports(id), getRecentReadings(id)]);
  return <ActivityTimeline items={buildTimeline({ diagnoses, labs, readings, patientId: id })} />;
}

async function Contact({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContactCard patient={await getPatient(id)} />;
}

async function Summary({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AiSummaryCard patientId={id} />;
}

export default function PatientOverviewPage({ params }: PageProps<"/patients/[id]">) {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-8">
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-lg" />}>
          <Summary params={params} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
          <Timeline params={params} />
        </Suspense>
      </div>
      <div className="space-y-5 lg:col-span-4">
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
          <Contact params={params} />
        </Suspense>
      </div>
    </div>
  );
}
