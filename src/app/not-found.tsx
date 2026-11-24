import { CompassIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <EmptyState
        className="card-surface max-w-md"
        icon={CompassIcon}
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={
          <Button asChild size="sm">
            <Link href="/patients">Go to patients</Link>
          </Button>
        }
      />
    </main>
  );
}
