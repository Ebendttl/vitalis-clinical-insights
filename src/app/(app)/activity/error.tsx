"use client";

import { RouteError } from "@/components/feedback/route-error";

export default function ActivityError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} title="Your activity couldn't load" />;
}
