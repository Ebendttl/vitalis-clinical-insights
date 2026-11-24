"use client";

import { useEffect } from "react";
import { ErrorState } from "./states";

/** Shared body for Next.js error.tsx boundaries: logs once and offers a retry. */
export function RouteError({ error, reset, title }: { error: Error & { digest?: string }; reset: () => void; title?: string }) {
  useEffect(() => {
    // Surfaced to monitoring in production; digest links to the server log entry.
    console.warn("[vitalis] route error", error.digest ?? error.message);
  }, [error]);
  return <ErrorState title={title} onRetry={reset} className="card-surface m-4 sm:m-6" />;
}
