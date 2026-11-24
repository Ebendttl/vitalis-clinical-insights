import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditTrail } from "@/features/audit/components/audit-trail";
import { getMyAuditTrail } from "@/features/audit/server/queries";

export const metadata: Metadata = { title: "Activity" };

async function Trail() {
  return <AuditTrail rows={await getMyAuditTrail()} />;
}

export default function ActivityPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader title="Activity" description="Your audit trail. Entries are append-only and can't be edited or deleted." />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
        <Trail />
      </Suspense>
    </div>
  );
}
