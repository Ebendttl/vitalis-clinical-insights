import { FlaskConicalIcon, HeartPulseIcon, InboxIcon, StethoscopeIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/feedback/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TimelineItem } from "../lib/timeline";

const ICON = { diagnosis: StethoscopeIcon, lab: FlaskConicalIcon, vital: HeartPulseIcon };
const TONE = {
  neutral: "bg-muted text-muted-foreground",
  normal: "bg-normal-subtle text-normal",
  elevated: "bg-elevated-subtle text-elevated",
  critical: "bg-critical-subtle text-critical",
};

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <Card aria-labelledby="timeline-heading">
      <CardHeader>
        <CardTitle id="timeline-heading">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={InboxIcon} title="No recent activity" description="Diagnoses, lab results and critical readings appear here." />
        ) : (
          <ol className="relative space-y-1 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
            {items.map((item) => {
              const Icon = ICON[item.kind];
              const body = (
                <>
                  <span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-card", TONE[item.tone])}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.title}</span>
                    {item.detail && <span className="block truncate text-sm text-muted-foreground">{item.detail}</span>}
                  </span>
                  <time dateTime={item.at} suppressHydrationWarning className="num shrink-0 pt-0.5 text-xs text-muted-foreground">
                    {formatDateTime(item.at)}
                  </time>
                </>
              );
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className="flex items-start gap-3 rounded-md p-1.5 transition-colors hover:bg-muted/60">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 p-1.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
