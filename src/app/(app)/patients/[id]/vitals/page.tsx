import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveDemoToggle } from "@/features/realtime-demo/components/live-demo-toggle";
import { VitalsAnalytics } from "@/features/vitals/components/vitals-analytics";

export const metadata: Metadata = { title: "Vitals" };

async function Analytics({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VitalsAnalytics patientId={id} live={<LiveDemoToggle patientId={id} />} />;
}

export default function VitalsPage({ params }: PageProps<"/patients/[id]/vitals">) {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] w-full rounded-lg" />}>
      <Analytics params={params} />
    </Suspense>
  );
}
