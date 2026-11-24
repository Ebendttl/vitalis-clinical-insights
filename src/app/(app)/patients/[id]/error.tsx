"use client";

import { RouteError } from "@/components/feedback/route-error";

export default function PatientError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} title="This patient record couldn't load" />;
}
