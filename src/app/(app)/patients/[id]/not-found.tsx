import { UserRoundXIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";

export default function PatientNotFound() {
  return (
    <EmptyState
      className="card-surface m-4 sm:m-6"
      icon={UserRoundXIcon}
      title="Patient not found"
      description="This patient doesn't exist or isn't assigned to you."
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/patients">Back to patients</Link>
        </Button>
      }
    />
  );
}
