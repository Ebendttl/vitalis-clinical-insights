import { ScrollTextIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/feedback/states";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { AuditRow } from "../server/queries";

const LABELS: Record<string, string> = {
  "patient.viewed": "Viewed patient record",
  "vitals.viewed": "Viewed vitals",
  "lab.previewed": "Previewed lab report",
  "lab.downloaded": "Downloaded lab report",
  "diagnosis.status_changed": "Changed diagnosis status",
  "ai_summary.generated": "Generated clinical summary",
  "ai_summary.failed": "Clinical summary failed validation",
  "demo.started": "Started live vitals demo",
};

function detail(row: AuditRow): string | null {
  const m = row.metadata;
  if (row.action === "diagnosis.status_changed") return `${String(m.from)} → ${String(m.to)}`;
  if (row.action.startsWith("ai_summary")) return m.source === "rule-based" ? `Rule-based fallback (${String(m.reason)})` : `Model ${String(m.model ?? "")}`;
  return null;
}

export function AuditTrail({ rows }: { rows: AuditRow[] }) {
  if (rows.length === 0) {
    return <EmptyState className="card-surface" icon={ScrollTextIcon} title="No activity yet" description="Record views, downloads and changes you make are logged here." />;
  }
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <caption className="sr-only">Your audit trail, most recent first</caption>
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">
                When
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Action
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Patient
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Detail
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="num px-4 py-2 whitespace-nowrap text-muted-foreground">
                  <time dateTime={row.created_at} suppressHydrationWarning>
                    {formatDateTime(row.created_at)}
                  </time>
                </td>
                <td className="px-4 py-2">{LABELS[row.action] ?? row.action}</td>
                <td className="px-4 py-2">
                  {row.patient_id && row.patients ? (
                    <Link href={`/patients/${row.patient_id}`} className="hover:underline">
                      {row.patients.full_name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{detail(row) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
