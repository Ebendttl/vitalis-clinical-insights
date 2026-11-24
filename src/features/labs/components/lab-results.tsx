"use client";

import { DownloadIcon, EyeIcon, FlaskConicalIcon, HourglassIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { EmptyState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LabReport } from "../schemas";
import { getLabReportUrl } from "../server/actions";

const FLAG = {
  normal: { tone: "normal", label: "Normal" },
  abnormal: { tone: "elevated", label: "Abnormal" },
  critical: { tone: "critical", label: "Critical" },
} as const;

function LabCard({ report, onPreview }: { report: LabReport; onPreview: (r: LabReport) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isPending = report.status === "pending";

  const download = () =>
    startTransition(async () => {
      setError(null);
      const res = await getLabReportUrl({ reportId: report.id, mode: "download" });
      if (res.ok) window.location.assign(res.url);
      else setError(res.error);
    });

  return (
    <li>
      <Card aria-labelledby={`lab-${report.id}`}>
        <CardHeader className="flex-wrap">
          <div className="space-y-1">
            <CardTitle id={`lab-${report.id}`} className="flex flex-wrap items-center gap-2">
              {report.type}
              {isPending ? (
                <Badge>
                  <HourglassIcon aria-hidden /> Awaiting result
                </Badge>
              ) : (
                <Badge tone={FLAG[report.flag].tone}>{FLAG[report.flag].label}</Badge>
              )}
              {report.status === "amended" && <Badge tone="accent">Amended</Badge>}
            </CardTitle>
            <p className="num text-xs text-muted-foreground">
              Collected {formatDate(report.collected_at)}
              {report.reported_at && ` · Reported ${formatDate(report.reported_at)}`}
            </p>
          </div>
          {!isPending && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onPreview(report)}>
                <EyeIcon /> Preview
              </Button>
              <Button variant="ghost" size="sm" onClick={download} disabled={pending} aria-label={`Download ${report.type} PDF`}>
                <DownloadIcon /> {pending ? "Preparing…" : "PDF"}
              </Button>
            </div>
          )}
        </CardHeader>
        {!isPending && (
          <CardContent>
            {error && (
              <p role="alert" className="mb-2 text-sm text-critical">
                {error}
              </p>
            )}
            <table className="w-full text-sm">
              <caption className="sr-only">{report.type} results</caption>
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="py-1 font-medium">
                    Analyte
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    Result
                  </th>
                  <th scope="col" className="hidden py-1 text-right font-medium sm:table-cell">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.results.map((r) => (
                  <tr key={r.analyte}>
                    <th scope="row" className="py-1.5 text-left font-normal">
                      {r.analyte}
                    </th>
                    <td className={cn("num py-1.5 text-right font-medium", r.flag === "critical" ? "text-critical" : r.flag === "abnormal" && "text-elevated")}>
                      {r.value} <span className="text-xs font-normal text-muted-foreground">{r.unit}</span>
                      {r.flag !== "normal" && <span className="sr-only"> ({r.flag})</span>}
                    </td>
                    <td className="num hidden py-1.5 text-right text-muted-foreground sm:table-cell">
                      {r.low}–{r.high}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>
    </li>
  );
}

export function LabResults({ reports }: { reports: LabReport[] }) {
  const [preview, setPreview] = useState<{ report: LabReport; url: string | null; error?: string } | null>(null);
  const [, startTransition] = useTransition();

  const openPreview = (report: LabReport) => {
    setPreview({ report, url: null });
    startTransition(async () => {
      const res = await getLabReportUrl({ reportId: report.id, mode: "preview" });
      setPreview(res.ok ? { report, url: res.url } : { report, url: null, error: res.error });
    });
  };

  if (reports.length === 0) {
    return <EmptyState className="card-surface" icon={FlaskConicalIcon} title="No lab results yet" description="Reports appear here once collected." />;
  }

  return (
    <>
      <ul className="grid gap-4 lg:grid-cols-2">
        {reports.map((r) => (
          <LabCard key={r.id} report={r} onPreview={openPreview} />
        ))}
      </ul>
      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="top-[4vh] flex h-[92vh] max-w-4xl flex-col gap-3 p-4">
          <DialogTitle className="pr-8">{preview?.report.type}</DialogTitle>
          <DialogDescription>Synthetic report. Collected {preview && formatDate(preview.report.collected_at)}.</DialogDescription>
          <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-muted">
            {preview?.url ? (
              <iframe title={`${preview.report.type} PDF preview`} src={preview.url} className="size-full" />
            ) : preview?.error ? (
              <p role="alert" className="p-6 text-sm text-critical">
                {preview.error}
              </p>
            ) : (
              <p className="p-6 text-sm text-muted-foreground" role="status">
                Loading report…
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
