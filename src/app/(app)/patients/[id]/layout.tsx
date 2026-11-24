import { Suspense } from "react";
import { auditAfterResponse } from "@/features/audit/server/log";
import { getDiagnoses } from "@/features/diagnoses/server/queries";
import { HeroSkeleton } from "@/features/patients/components/hero-skeleton";
import { PatientHero } from "@/features/patients/components/patient-hero";
import { PatientTabs } from "@/features/patients/components/patient-tabs";
import { getPatient } from "@/features/patients/server/queries";
import { getRecentReadings } from "@/features/vitals/server/queries";

async function HeroLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [patient, readings, diagnoses] = await Promise.all([getPatient(id), getRecentReadings(id), getDiagnoses(id)]);
  auditAfterResponse({ action: "patient.viewed", entityType: "patient", entityId: id, patientId: id });
  return (
    <>
      <PatientHero
        patient={patient}
        initialReadings={readings}
        chronicConditionCount={diagnoses.filter((d) => d.status !== "resolved").length}
      />
      <PatientTabs patientId={id} />
    </>
  );
}

export default function PatientLayout({ children, params }: LayoutProps<"/patients/[id]">) {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Suspense fallback={<HeroSkeleton />}>
        <HeroLoader params={params} />
      </Suspense>
      {children}
    </div>
  );
}
